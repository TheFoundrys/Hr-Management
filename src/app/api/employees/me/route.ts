import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get employee_id from users table
    const userResult = await query('SELECT employee_id FROM users WHERE id = $1', [userId]);
    const empIdStr = userResult.rows[0]?.employee_id;

    if (!empIdStr) {
      return NextResponse.json({ error: 'Employee profile not linked' }, { status: 404 });
    }

    // 2. Get full employee details
    const result = await query(
      `SELECT e.*, d.name as department_name, ds.name as designation_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations ds ON e.designation_id = ds.id
       WHERE e.university_id = $1 AND e.tenant_id = $2`,
      [empIdStr, tenantId]
    );

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
      role: userRole,
    };

    return NextResponse.json({ success: true, employee });
  } catch (error) {
    console.error('Get my profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
