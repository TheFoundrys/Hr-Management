import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();

    const result = await query(
      `SELECT lb.*, lt.name as type_name, lt.code as type_code, lt.color
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       JOIN employees e ON lb.employee_id = e.id
       WHERE (e.id::text = $1 OR e.employee_id = $1 OR e.university_id = $1) AND lb.tenant_id = $2 AND lb.year = $3`,
      [employeeId, tenantId, currentYear]
    );

    // Auto-init balances if none exist
    if ((result.rowCount || 0) === 0) {
      const types = await query('SELECT id, max_per_year FROM leave_types WHERE tenant_id = $1', [tenantId]);
      const empRes = await query('SELECT id FROM employees WHERE (id::text = $1 OR employee_id = $1 OR university_id = $1) AND tenant_id = $2', [employeeId, tenantId]);
      
      if ((types.rowCount || 0) > 0 && (empRes.rowCount || 0) > 0) {
        const empUuid = empRes.rows[0].id;
        for (const type of types.rows) {
          await query(
            `INSERT INTO leave_balances (tenant_id, employee_id, leave_type_id, year, allocated_days, used_days, remaining_days)
             VALUES ($1, $2, $3, $4, $5, 0, $5)
             ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING`,
            [tenantId, empUuid, type.id, currentYear, type.max_per_year || 12]
          );
        }
        
        const finalResult = await query(
          `SELECT lb.*, lt.name as type_name, lt.code as type_code, lt.color
           FROM leave_balances lb
           JOIN leave_types lt ON lb.leave_type_id = lt.id
           WHERE lb.employee_id = $1 AND lb.tenant_id = $2 AND lb.year = $3`,
          [empUuid, tenantId, currentYear]
        );
        return NextResponse.json({ success: true, balances: finalResult.rows });
      }
    }

    return NextResponse.json({ success: true, balances: result.rows });
  } catch (error) {
    console.error('Fetch leave balances error:', error);
    return NextResponse.json({ error: 'Failed to fetch leave balances' }, { status: 500 });
  }
}
