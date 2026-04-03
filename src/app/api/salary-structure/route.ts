import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);

    // Join with employees to get name and university_id (TFU-XXXXX)
    const result = await query(
      `SELECT p.*, e.first_name, e.last_name, e.university_id 
       FROM payslip_records p
       JOIN employees e ON p.user_id = e.employee_id
       WHERE p.tenant_id = $1
       ORDER BY p.year DESC, p.month DESC`,
      [tenantId]
    );

    const records = result.rows.map(row => ({
      id: row.id,
      employeeId: row.university_id,
      name: `${row.first_name} ${row.last_name}`,
      month: `${row.year}-${String(row.month).padStart(2, '0')}`,
      basicSalary: Number(row.basic_salary),
      hra: Number(row.hra),
      allowances: Number(row.allowances),
      grossSalary: Number(row.basic_salary) + Number(row.hra) + Number(row.allowances),
      deductions: Number(row.deductions),
      netSalary: Number(row.net_salary),
      status: row.status
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
    const { id, basicSalary, hra, allowances, deductions } = body;

    const netSalary = Number(basicSalary) + Number(hra) + Number(allowances) - Number(deductions);

    await query(
      `UPDATE payslip_records SET
        basic_salary = $1, hra = $2, allowances = $3, deductions = $4,
        net_salary = $5, updated_at = NOW()
       WHERE id = $6 AND tenant_id = $7`,
      [basicSalary, hra, allowances, deductions, netSalary, id, tenantId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update salary error:', error);
    return NextResponse.json({ error: 'Failed to update salary record' }, { status: 500 });
  }
}
