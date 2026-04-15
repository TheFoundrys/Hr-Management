import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    let userId = request.headers.get('x-user-id');
    let userRole = request.headers.get('x-user-role');

    // Fallback: Verify token directly if headers are missing
    if (!userId) {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth-token')?.value;
      if (token) {
        const payload = await verifyToken(token);
        if (payload) {
          userId = payload.userId;
          userRole = payload.role;
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized credentials' }, { status: 401 });
    }

    // 1. Resolve User and current Employee pointer
    const userResult = await query('SELECT id, name, email, employee_id, role, tenant_id FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
    const user = userResult.rows[0];

    if (!user) {
      return NextResponse.json({ error: 'Identity mismatch' }, { status: 404 });
    }

    const email = user.email;
    const empIdStr = user.employee_id;

    // 2. Fetch Employee record joined with Department/Designation
    let result = await query(
      `SELECT e.*, d.name as department_name, ds.name as designation_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations ds ON e.designation_id = ds.id
       WHERE (e.university_id = $1 OR e.email = $2) AND e.tenant_id = $3 LIMIT 1`,
      [empIdStr, email, tenantId]
    );

    // 3. SELF-HEALING: Auto-onboard if personnel record is missing
    if (result.rowCount === 0) {
      const names = user.name.split(' ');
      const firstName = names[0];
      const lastName = names.slice(1).join(' ') || 'User';
      const newEmpId = empIdStr || `TFU-AUTO-${Date.now().toString().slice(-6)}`;
      
      // Dynamically find a department if one exists, otherwise null
      const deptRes = await query('SELECT id FROM departments WHERE tenant_id = $1 LIMIT 1', [tenantId]);
      const defaultDept = deptRes.rows[0]?.id || null;

      await query(
        `INSERT INTO employees (id, employee_id, university_id, first_name, last_name, email, tenant_id, department_id, user_id, is_active, role)
         VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, true, $9)
         ON CONFLICT (email, tenant_id) DO UPDATE SET user_id = EXCLUDED.user_id`,
        [crypto.randomUUID(), newEmpId, firstName, lastName, email, tenantId, defaultDept, userId, userRole]
      );

      // Link User record if it wasn't already
      await query('UPDATE users SET employee_id = $1, is_active = true WHERE id = $2', [newEmpId, userId]);

      // Re-fetch the healed record
      result = await query(
        `SELECT e.*, d.name as department_name, ds.name as designation_name
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN designations ds ON e.designation_id = ds.id
         WHERE e.email = $1 AND e.tenant_id = $2 LIMIT 1`,
        [email, tenantId]
      );
    }

    const emp = result.rows[0];
    const bankAcc = emp.bank_account || '';
    const maskedAccount = bankAcc.length > 4 ? `****-****-${bankAcc.slice(-4)}` : bankAcc;

    const employee = {
      ...emp,
      name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      firstName: emp.first_name,
      lastName: emp.last_name,
      employee_id: emp.employee_id,
      university_id: emp.university_id,
      department: emp.department_name || 'N/A',
      designation: emp.designation_name || 'N/A',
      role: userRole || emp.role,
      bank_account: maskedAccount,
      joinDate: emp.join_date || emp.created_at,
      salary: {
        basic: Number(emp.salary_basic || 0),
        hra: Number(emp.salary_hra || 0),
        allowances: Number(emp.salary_allowances || 0),
        deductions: Number(emp.salary_deductions || 0)
      }
    };

    return NextResponse.json({ success: true, employee });
  } catch (error) {
    console.error('SYSTEM ERROR [Profile Resolution]:', error);
    return NextResponse.json({ error: 'Internal system fault resolution failed.' }, { status: 500 });
  }
}
