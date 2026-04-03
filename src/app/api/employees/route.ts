import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { employeeSchema } from '@/lib/utils/validation';
import { verifyToken } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { tenantId, role } = payload;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let queryString = `
      SELECT e.*, d.name as department_name, ds.name as designation_name,
             m.first_name || ' ' || m.last_name as manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations ds ON e.designation_id = ds.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.tenant_id = $1 AND e.is_active = true
    `;
    const params: unknown[] = [tenantId];

    if (search) {
      params.push(`%${search}%`);
      queryString += ` AND (e.first_name ILIKE $2 OR e.last_name ILIKE $2 OR e.email ILIKE $2 OR e.university_id ILIKE $2)`;
    }

    queryString += ' ORDER BY e.created_at DESC';
    const result = await query(queryString, params);

    // Map DB columns back to frontend-expected format
    const employees = result.rows.map(emp => ({
      ...emp,
      _id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`.trim(),
      employeeId: emp.university_id,
      department: emp.department_name || 'N/A',
      designation: emp.designation_name || 'N/A',
      managerName: emp.manager_name || 'N/A',
      salary: {
        basic: emp.salary_basic || 0,
        hra: emp.salary_hra || 0,
        allowances: emp.salary_allowances || 0,
        deductions: emp.salary_deductions || 0
      }
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
    if (!payload || !['ADMIN', 'HR'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { tenantId } = payload;

    // Standardized fields from Phase 4
    const { employeeId, name, email, role, departmentId, managerId, salary } = body;
    
    if (!employeeId || !name || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ') || '';

    // 1. Transaction to Create Employee and User
    const result = await query(
      `INSERT INTO employees (
        university_id, employee_id, first_name, last_name, email, role, 
        department_id, manager_id, tenant_id, 
        salary_basic, salary_hra, salary_allowances, salary_deductions, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
      RETURNING *`,
      [
        employeeId, employeeId, firstName, lastName, email, role, 
        departmentId || null, managerId || null, tenantId, 
        salary?.basic || 0, salary?.hra || 0, salary?.allowances || 0, salary?.deductions || 0
      ]
    );

    return NextResponse.json({ success: true, employee: result.rows[0] }, { status: 201 });
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
    if (!payload || !['ADMIN', 'HR'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { tenantId } = payload;
    const { university_id, ...updateData } = body;

    const { first_name, last_name, email, phone, role, department_id, manager_id, salary, is_active } = updateData;

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
        updated_at = NOW()
      WHERE university_id = $14 AND tenant_id = $12
      RETURNING *`,
      [
        first_name, last_name, email, phone, role, 
        department_id, manager_id,
        salary?.basic, salary?.hra, salary?.allowances, salary?.deductions,
        tenantId, is_active, university_id
      ]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

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
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tenantId } = payload;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await query(
      'UPDATE employees SET is_active = false, updated_at = NOW() WHERE university_id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    return NextResponse.json({ success: true, message: 'Employee deactivated' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

