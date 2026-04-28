import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { tenantId, userId } = payload;
    const role = (payload.role || 'STAFF').toUpperCase();
    
    // Get internal employee ID and department for the current user
    const empResult = await query(
      'SELECT id, department_id FROM employees WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );
    
    if ((empResult.rowCount || 0) === 0 && !['ADMIN', 'HR', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ success: true, team: [] });
    }

    const currentEmployeeId = empResult.rows[0]?.id;
    const currentDepartmentId = empResult.rows[0]?.department_id;

    let teamQuery = '';
    let queryParams: any[] = [tenantId];

    if (['ADMIN', 'HR', 'SUPER_ADMIN'].includes(role)) {
      // HR and ADMIN see everyone in the tenant
      teamQuery = `
        SELECT e.*, d.name as department_name, ds.name as designation_name,
               m.first_name || ' ' || m.last_name as manager_name,
               (SELECT COUNT(*) FROM employees r WHERE r.manager_id = e.id) as reports_count
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN designations ds ON e.designation_id = ds.id
        LEFT JOIN employees m ON e.manager_id = m.id
        WHERE e.tenant_id = $1 AND e.is_active = true
        ORDER BY d.name, e.first_name
      `;
    } else if (role === 'HOD' && currentDepartmentId) {
      // HOD sees everyone in their department
      teamQuery = `
        SELECT e.*, d.name as department_name, ds.name as designation_name,
               m.first_name || ' ' || m.last_name as manager_name,
               (SELECT COUNT(*) FROM employees r WHERE r.manager_id = e.id) as reports_count
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN designations ds ON e.designation_id = ds.id
        LEFT JOIN employees m ON e.manager_id = m.id
        WHERE e.tenant_id = $1 AND e.department_id = $2 AND e.is_active = true
        ORDER BY e.first_name
      `;
      queryParams.push(currentDepartmentId);
    } else {
      // Manager or STAFF: Use recursive CTE to find reports
      // If they have no reports, it will only return themselves (as per "return only their own data" for staff)
      teamQuery = `
        WITH RECURSIVE subordinates AS (
          -- Start with the user themselves
          SELECT id, manager_id, first_name, last_name, email, university_id, department_id, designation_id, role, 0 as level
          FROM employees
          WHERE id = $1 AND tenant_id = $2
          
          UNION ALL
          
          -- Recurse to find reports
          SELECT e.id, e.manager_id, e.first_name, e.last_name, e.email, e.university_id, e.department_id, e.designation_id, e.role, s.level + 1
          FROM employees e
          INNER JOIN subordinates s ON s.id = e.manager_id
          WHERE e.tenant_id = $2 AND e.is_active = true
        )
        SELECT s.*, d.name as department_name, ds.name as designation_name,
               m.first_name || ' ' || m.last_name as manager_name,
               (SELECT COUNT(*) FROM employees r WHERE r.manager_id = s.id) as reports_count
        FROM subordinates s
        LEFT JOIN departments d ON s.department_id = d.id
        LEFT JOIN designations ds ON s.designation_id = ds.id
        LEFT JOIN employees m ON s.manager_id = m.id
        ORDER BY s.level, s.first_name
      `;
      queryParams = [currentEmployeeId, tenantId];
    }

    const result = await query(teamQuery, queryParams);
    
    // Map for frontend
    const team = result.rows.map(row => ({
      ...row,
      name: `${row.first_name} ${row.last_name}`.trim(),
    }));

    return NextResponse.json({ success: true, team });

  } catch (error) {
    console.error('Team fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

