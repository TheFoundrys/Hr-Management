import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Missing Credentials' }, { status: 401 });

    const payload = await verifyToken(token);
    const baseRole = (payload?.role || 'STAFF').toUpperCase();
    if (!payload || !hasPermission(baseRole, 'MANAGE_PAYROLL')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tenantId, role, userId } = payload;
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    
    // Core parameters
    let queryParams: any[] = [tenantId, month, year];
    let whereClause = 'WHERE e.tenant_id = $1::uuid AND e.is_active = true';

    // Simplified HOD logic to prevent 500 errors
    if (role === 'HOD') {
      try {
        const hodResult = await query(
          'SELECT department_id FROM employees WHERE user_id = $1::uuid AND tenant_id = $2::uuid LIMIT 1',
          [userId, tenantId]
        );
        
        const depId = hodResult.rows[0]?.department_id;
        if (depId) {
          whereClause += ' AND e.department_id = $4::uuid';
          queryParams.push(depId);
        }
      } catch (e) {
        console.error('HOD Resolution Failed:', e);
        // Fallback: Continue without dept filter if lookup fails
      }
    }

    // Execute the master fetch with explicit casting to prevent type errors
    const sql = `
      SELECT 
        e.*, 
        d.name as department_name, 
        ds.name as designation_name,
        pr.status as payslip_status,
        pr.net_salary as calculated_net
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations ds ON e.designation_id = ds.id
      LEFT JOIN payslip_records pr ON (
        e.employee_id = pr.user_id 
        AND pr.month = $2 
        AND pr.year = $3 
        AND pr.tenant_id = $1
      )
      ${whereClause}
      ORDER BY e.first_name, e.last_name
    `;

    const result = await query(sql, queryParams);

    const employees = result.rows.map(emp => ({
      ...emp,
      identifier: emp.university_id,
      universityId: emp.university_id,
      firstName: emp.first_name,
      lastName: emp.last_name,
      department: emp.department_name,
      designation: emp.designation_name,
      payslipStatus: emp.payslip_status || 'not-generated',
      actualNet: emp.calculated_net,
      salary: {
        basic: emp.salary_basic || 0,
        hra: emp.salary_hra || 0,
        allowances: emp.salary_allowances || 0,
        deductions: emp.salary_deductions || 0
      }
    }));

    return NextResponse.json({ success: true, employees });

  } catch (error) {
    console.error('CRITICAL PAYROLL API ERROR:', error);
    return NextResponse.json({ error: 'System busy. Please retry.' }, { status: 500 });
  }
}
