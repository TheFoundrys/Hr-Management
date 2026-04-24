import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { verifyToken } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { hasPermission } from '@/lib/auth/rbac';
import { autoLinkBiometric } from '@/lib/attendance/engine';
import { sendOnboardingInvite } from '@/lib/mail/mailer';
import { logAudit } from '@/lib/utils/audit';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { tenantId, userId, role } = payload;
    const baseRole = (role || 'STAFF').toUpperCase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const scope = searchParams.get('scope'); // 'all' or 'team'

    // Check RBAC permission
    if (!hasPermission(role, 'VIEW_ALL_EMPLOYEES') && !hasPermission(role, 'VIEW_TEAM')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const canViewPayroll = hasPermission(baseRole, 'MANAGE_PAYROLL');

    // Core employee fields
    const empFields = `
      e.id, e.university_id, e.first_name, e.last_name, e.email, e.phone, e.role, e.is_active,
      e.department_id, e.designation_id, e.manager_id, e.employee_id
      ${canViewPayroll ? ', e.salary_basic, e.salary_hra, e.salary_allowances, e.salary_deductions' : ''}
    `;

    // 1. Get current employee's context
    const empCtxRes = await query(
      'SELECT id, department_id FROM employees WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );
    const currentEmployeeId = empCtxRes.rows[0]?.id;
    const currentDepartmentId = empCtxRes.rows[0]?.department_id;

    let queryString = '';
    let params: any[] = [tenantId];

    const isPowerful = hasPermission(baseRole, 'VIEW_ALL_EMPLOYEES');
    const effectiveScope = isPowerful ? (scope || 'all') : 'team';

    if (effectiveScope === 'all' && isPowerful) {
      queryString = `
        SELECT ${empFields}, d.name as department_name, ds.name as designation_name,
               m.first_name || ' ' || m.last_name as reporting_name
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN designations ds ON e.designation_id = ds.id
        LEFT JOIN employees m ON e.manager_id = m.id
        WHERE e.tenant_id = $1
      `;
      if (search) {
        params.push(`%${search}%`);
        queryString += ` AND (e.first_name ILIKE $2 OR e.last_name ILIKE $2 OR e.email ILIKE $2 OR e.university_id ILIKE $2)`;
      }
      queryString += ' ORDER BY d.name, e.first_name';
    } else {
      // Scoped View (Team/Department)
      if (baseRole === 'HOD' && currentDepartmentId) {
        queryString = `
          SELECT ${empFields}, d.name as department_name, ds.name as designation_name,
                 m.first_name || ' ' || m.last_name as reporting_name,
                 (SELECT COUNT(*) FROM employees r WHERE r.manager_id = e.id) as reports_count
          FROM employees e
          LEFT JOIN departments d ON e.department_id = d.id
          LEFT JOIN designations ds ON e.designation_id = ds.id
          LEFT JOIN employees m ON e.manager_id = m.id
          WHERE e.tenant_id = $1 AND e.department_id = $2
        `;
        params.push(currentDepartmentId);
        if (search) {
          params.push(`%${search}%`);
          queryString += ` AND (e.first_name ILIKE $3 OR e.last_name ILIKE $3 OR e.email ILIKE $3)`;
        }
        queryString += ' ORDER BY e.first_name';
      } else {
        const subFields = `id, manager_id, first_name, last_name, email, university_id, employee_id, department_id, designation_id, role, phone, is_active ${canViewPayroll ? ', salary_basic, salary_hra, salary_allowances, salary_deductions' : ''}`;

        queryString = `
          WITH RECURSIVE subordinates AS (
            SELECT ${subFields}, 0 as level
            FROM employees
            WHERE id = $1 AND tenant_id = $2
            UNION ALL
            SELECT e.${subFields.replace(/,/g, ', e.')}, s.level + 1
            FROM employees e
            INNER JOIN subordinates s ON s.id = e.manager_id
            WHERE e.tenant_id = $2
          )
          SELECT s.*, d.name as department_name, ds.name as designation_name,
                 m.first_name || ' ' || m.last_name as reporting_name,
                 (SELECT COUNT(*) FROM employees r WHERE r.manager_id = s.id) as reports_count
          FROM subordinates s
          LEFT JOIN departments d ON s.department_id = d.id
          LEFT JOIN designations ds ON s.designation_id = ds.id
          LEFT JOIN employees m ON s.manager_id = m.id
          ORDER BY s.level, s.first_name
        `;
        params = [currentEmployeeId, tenantId];
      }
    }

    const result = await query(queryString, params);

    const employees = result.rows.map(emp => ({
      ...emp,
      name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      status: emp.is_active ? 'active' : 'inactive',
      reporting_name: emp.reporting_name || 'System Admin',
      department_name: emp.department_name || 'Institutional',
      designation_name: emp.designation_name || emp.role
    }));

    return NextResponse.json({ success: true, employees });
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'MANAGE_EMPLOYEES')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { tenantId, role: currentUserRole } = payload;
    const { employeeId, name, email, role: targetRole, departmentId, designationId, reportsToId, salary, biometricId } = body;

    // Enforce role restrictions
    if (targetRole === 'ADMIN' && currentUserRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only Super Admin can create Admin accounts' }, { status: 403 });
    }
    if (targetRole === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin accounts are single-instance only' }, { status: 403 });
    }

    if (!employeeId || !name || !email || !targetRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ') || '';

    let finalDepartmentId = null;
    if (departmentId && departmentId.trim()) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(departmentId);
      if (isUuid) {
        finalDepartmentId = departmentId;
      } else {
        const deptName = departmentId.replace(/^pre-/, '').trim();
        const deptRes = await query(
          `INSERT INTO departments (tenant_id, name)
           VALUES ($1, $2)
           ON CONFLICT (tenant_id, name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [tenantId, deptName]
        );
        if (deptRes.rows.length > 0) finalDepartmentId = deptRes.rows[0].id;
      }
    }

    let finalManagerId = null;
    if (reportsToId && reportsToId.trim()) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reportsToId);
      if (isUuid) {
        finalManagerId = reportsToId;
      } else {
        const mgrRes = await query(
          `SELECT id FROM employees WHERE (university_id = $1 OR employee_id = $1) AND tenant_id = $2 LIMIT 1`,
          [reportsToId, tenantId]
        );
        if (mgrRes.rows.length > 0) finalManagerId = mgrRes.rows[0].id;
      }
    }

    const tempPassword = crypto.randomBytes(6).toString('hex');
    const { hashPassword } = await import('@/lib/auth/password');
    const passwordHash = await hashPassword(tempPassword);
    
    const verificationToken = crypto.randomUUID();
    const verificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const result = await query(
      `WITH new_emp AS (
        INSERT INTO employees (
          university_id, employee_id, first_name, last_name, email, role, 
          department_id, designation_id, manager_id, tenant_id, 
          salary_basic, salary_hra, salary_allowances, salary_deductions, is_active, biometric_id
        ) VALUES ($1, $1, $2, $3, $4, $5, $6, $17, $7, $8, $9, $10, $11, $12, true, $14)
        RETURNING id, university_id, first_name, last_name, email, role, tenant_id
      )
      INSERT INTO users (
        name, email, password_hash, role, tenant_id, employee_id, 
        is_active, is_verified, verification_token, verification_token_expires
      )
      SELECT first_name || ' ' || last_name, email, $13, role, tenant_id, university_id, 
             true, false, $15, $16
      FROM new_emp
      RETURNING *`,
      [
        employeeId, firstName, lastName, email, targetRole,
        finalDepartmentId, finalManagerId, tenantId,
        salary?.basic || 0, salary?.hra || 0, salary?.allowances || 0, salary?.deductions || 0,
        passwordHash, biometricId || employeeId,
        verificationToken, verificationExpires,
        designationId || null
      ]
    );

    try {
      await sendOnboardingInvite(email, name, tempPassword, verificationToken);
    } catch (mailError) {
      console.warn('Onboarding email delivery failed:', mailError);
    }

    const newEmployee = result.rows[0];
    const targetBiometricId = biometricId || employeeId;
    if (targetBiometricId) {
      autoLinkBiometric(targetBiometricId, tenantId).catch(console.error);
    }

    return NextResponse.json({ success: true, employee: newEmployee }, { status: 201 });
  } catch (error: any) {
    console.error('Create employee error:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Employee ID or Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'MANAGE_EMPLOYEES')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { tenantId } = payload;
    const { university_id, ...updateData } = body;

    const { first_name, last_name, email, phone, role, department_id, designation_id, manager_id, salary, is_active, biometric_id } = updateData;

    const result = await query(
      `UPDATE employees SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        role = COALESCE($5, role),
        department_id = $6,
        manager_id = $7,
        salary_basic = COALESCE($8, salary_basic),
        salary_hra = COALESCE($9, salary_hra),
        salary_allowances = COALESCE($10, salary_allowances),
        salary_deductions = COALESCE($11, salary_deductions),
        is_active = COALESCE($13, is_active),
        biometric_id = COALESCE($15, biometric_id),
        designation_id = $16,
        updated_at = NOW()
      WHERE university_id = $14 AND tenant_id = $12
      RETURNING *`,
      [
        first_name, last_name, email, phone, role,
        department_id, manager_id,
        salary?.basic, salary?.hra, salary?.allowances, salary?.deductions,
        tenantId, is_active, university_id, biometric_id,
        designation_id
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    await logAudit({
      tenantId,
      userId: payload.userId,
      action: 'UPDATE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: university_id,
      newValue: result.rows[0],
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    return NextResponse.json({ success: true, employee: result.rows[0] });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !hasPermission(payload.role, 'MANAGE_EMPLOYEES')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    
    const { tenantId } = payload;

    const empRes = await query('SELECT id, email FROM employees WHERE (university_id = $1 OR employee_id = $1) AND tenant_id = $2', [id, tenantId]);
    if (empRes.rows.length === 0) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    const emp = empRes.rows[0];

    await query('DELETE FROM users WHERE (email = $1 OR employee_id = $2) AND tenant_id = $3', [emp.email, id, tenantId]);
    await query('DELETE FROM attendance WHERE employee_id = $1 AND tenant_id = $2', [emp.id, tenantId]);
    await query('DELETE FROM leave_requests WHERE employee_id = $1 AND tenant_id = $2', [emp.id, tenantId]);
    await query('DELETE FROM employees WHERE id = $1', [emp.id]);

    await logAudit({
      tenantId,
      userId: payload.userId,
      action: 'OFFBOARD_EMPLOYEE',
      entityType: 'EMPLOYEE',
      entityId: id,
      oldValue: emp,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
    });

    return NextResponse.json({ success: true, message: 'Employee permanently off-boarded' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
