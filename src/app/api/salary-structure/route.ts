import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);

    const result = await query(
      `SELECT 
        e.university_id, e.employee_id, e.first_name, e.last_name,
        COALESCE(p.basic_salary, e.salary_basic) as basic_salary,
        COALESCE(p.hra, e.salary_hra) as hra,
        COALESCE(p.allowances, e.salary_allowances) as allowances,
        COALESCE(p.deductions, e.salary_deductions) as deductions,
        COALESCE(p.net_salary, (e.salary_basic + e.salary_hra + e.salary_allowances - e.salary_deductions)) as net_salary,
        p.id as payslip_id, p.status, p.month, p.year
       FROM employees e
       LEFT JOIN payslip_records p ON e.employee_id = p.user_id AND p.tenant_id = e.tenant_id::text
       WHERE e.tenant_id::text = $1::text
       ORDER BY e.university_id ASC`,
      [tenantId]
    );

    const records = result.rows.map(row => ({
      id: row.payslip_id || row.university_id, // Use university_id if no payslip
      employeeId: row.university_id,
      name: `${row.first_name} ${row.last_name}`,
      month: row.month ? `${row.year}-${String(row.month).padStart(2, '0')}` : 'Base Package',
      basicSalary: Number(row.basic_salary),
      hra: Number(row.hra),
      allowances: Number(row.allowances),
      grossSalary: Number(row.basic_salary) + Number(row.hra) + Number(row.allowances),
      deductions: Number(row.deductions),
      netSalary: Number(row.net_salary),
      status: row.status || 'Active'
    }));

    return NextResponse.json({ success: true, records });
  } catch (error) {
    console.error('Get salary structure error:', error);
    return NextResponse.json({ error: 'Failed to fetch salary records' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const body = await request.json();
    const { id, employeeId, basicSalary, hra, allowances, deductions } = body;

    const netSalary = Number(basicSalary) + Number(hra) + Number(allowances) - Number(deductions);

    // If 'id' is different from 'employeeId', it means we are updating an existing payslip_record
    // Otherwise, we are updating the BASE salary in the 'employees' table
    const isPayslip = id !== employeeId;

    if (isPayslip) {
      await query(
        `UPDATE payslip_records SET
          basic_salary = $1, hra = $2, allowances = $3, deductions = $4,
          net_salary = $5, is_manual = TRUE, updated_at = NOW()
         WHERE id = $6 AND tenant_id::text = $7::text`,
        [basicSalary, hra, allowances, deductions, netSalary, id, tenantId]
      );
    } else {
      await query(
        `UPDATE employees SET
          salary_basic = $1, salary_hra = $2, salary_allowances = $3, salary_deductions = $4,
          updated_at = NOW()
         WHERE university_id = $5 AND tenant_id::text = $6::text`,
        [basicSalary, hra, allowances, deductions, id, tenantId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update salary error:', error);
    return NextResponse.json({ error: 'Failed to update salary record' }, { status: 500 });
  }
}
