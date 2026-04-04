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
      return NextResponse.json({ error: 'Unauthorized. User context missing.' }, { status: 401 });
    }

    // 1. First try to get employee_id from users table
    const userResult = await query('SELECT email, employee_id FROM users WHERE id = $1', [userId]);
    const userRow = userResult.rows[0];
    const email = userRow?.email;
    const empIdStr = userRow?.employee_id;

    // 2. Get full employee details (Try by university_id first, then fallback to email)
    let result;
    if (empIdStr) {
      result = await query(
        `SELECT e.*, d.name as department_name, ds.name as designation_name
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN designations ds ON e.designation_id = ds.id
         WHERE e.university_id = $1 AND e.tenant_id = $2`,
        [empIdStr, tenantId]
      );
    }

    if (!result || result.rows.length === 0) {
      // Fallback: try by email
      result = await query(
        `SELECT e.*, d.name as department_name, ds.name as designation_name
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN designations ds ON e.designation_id = ds.id
         WHERE e.email = $1 AND e.tenant_id = $2`,
        [email, tenantId]
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const emp = result.rows[0];
    const employee = {
      ...emp,
      name: `${emp.first_name} ${emp.last_name}`.trim(),
      employee_id: emp.university_id,
      department: emp.department_name || 'N/A',
      designation: emp.designation_name || 'N/A',
      joining_date: emp.join_date,
      role: userRole,
    };

    return NextResponse.json({ success: true, employee });
  } catch (error) {
    console.error('Get my profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
