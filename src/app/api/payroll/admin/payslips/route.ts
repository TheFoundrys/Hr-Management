import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !['ADMIN', 'HR', 'HOD'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tenantId, role, userId } = payload;
    
    let queryParams: any[] = [tenantId];
    let whereClause = 'WHERE e.tenant_id = $1 AND e.is_active = true';

    // If HOD, restrict to their department
    if (role === 'HOD') {
      const hodResult = await query(
        'SELECT department_id FROM employees WHERE user_id = $1 AND tenant_id = $2',
        [userId, tenantId]
      );
      const depId = hodResult.rows[0]?.department_id;
      if (depId) {
        whereClause += ' AND e.department_id = $2';
        queryParams.push(depId);
      }
    }

    // Get all employees for the tenant (or department) with their departments and salary info
    const result = await query(`
      SELECT e.*, d.name as department_name, ds.name as designation_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations ds ON e.designation_id = ds.id
      ${whereClause}
      ORDER BY e.first_name, e.last_name
    `, queryParams);

    const employees = result.rows.map(emp => ({
      ...emp,
      universityId: emp.university_id,
      firstName: emp.first_name,
      lastName: emp.last_name,
      department: emp.department_name,
      designation: emp.designation_name,
      salary: {
        basic: emp.salary_basic || 0,
        hra: emp.salary_hra || 0,
        allowances: emp.salary_allowances || 0,
        deductions: emp.salary_deductions || 0
      }
    }));

    return NextResponse.json({ success: true, employees });

  } catch (error) {
    console.error('Fetch admin payroll data error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
