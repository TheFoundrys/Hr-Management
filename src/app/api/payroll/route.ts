import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const employeeId = searchParams.get('employeeId');

    const filter = employeeId
      ? `AND p.user_id = $4`
      : ``;
    const params = employeeId ? [tenantId, month, year, employeeId] : [tenantId, month, year];

    const result = await query(
      `SELECT 
        p.*, 
        COALESCE(e.first_name || ' ' || e.last_name, 'Unknown Employee') as employee_name, 
        COALESCE(e.university_id, p.user_id) as employee_id
       FROM payslip_records p
       LEFT JOIN employees e ON p.user_id = e.university_id
       WHERE p.tenant_id = $1 AND p.month = $2 AND p.year = $3 ${filter}
       ORDER BY p.generated_at DESC`,
      params
    );



    return NextResponse.json({ success: true, payslips: result.rows });
  } catch (error) {
    console.error('Get payslips error:', error);
    return NextResponse.json({ error: 'Failed to fetch payslips' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const body = await request.json();
    const { month, year, employeeId, basic: overrideBasic, hra: overrideHra, allowances: overrideAllowances, deductions: overrideDeductions } = body;

    let empQuery = `
      SELECT e.*, d.name as department_name, ds.name as designation_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations ds ON e.designation_id = ds.id
      WHERE e.tenant_id = $1 AND e.is_active = true`;
    
    const empParams: unknown[] = [tenantId];
    if (employeeId) {
      empQuery += ' AND e.employee_id = $2';
      empParams.push(employeeId);
    }

    const empResult = await query(empQuery, empParams);
    const employees = empResult.rows;
    const results = [];
    const today = new Date();

    for (const emp of employees) {
      try {
        console.log(`Processing payroll for ${emp.first_name} (${emp.employee_id})`);

        // A. Check for existing manual payslip
        const existingResult = await query(
          `SELECT * FROM payslip_records WHERE user_id = $1 AND month = $2 AND year = $3 AND tenant_id = $4`,
          [emp.employee_id, month, year, tenantId]
        );
        const existing = existingResult.rows[0];

        // If it's a batch run and the record was manually edited, skip to preserve edits
        if (!employeeId && existing?.is_manual) {
          console.log(`- Skipping ${emp.first_name}: Manual record exists.`);
          continue;
        }
        
        // 1. Get attendance using UUID (emp.id)
        const attendanceResult = await query(
          `SELECT * FROM attendance 
           WHERE tenant_id = $1 AND employee_id = $2 
           AND EXTRACT(MONTH FROM date) = $3 AND EXTRACT(YEAR FROM date) = $4`,
          [tenantId, emp.id, month, year]
        );
        const attendanceRecords = attendanceResult.rows;

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        let workingDaysTotal = 0;
        let workingDaysSoFar = 0;
        
        const current = new Date(startDate);
        while (current <= endDate) {
          const day = current.getDay();
          if (day !== 0 && day !== 6) {
             workingDaysTotal++;
             if (current <= today) workingDaysSoFar++;
          }
          current.setDate(current.getDate() + 1);
        }

        const leaveResult = await query(
          `SELECT lr.*, lt.is_paid 
           FROM leave_requests lr
           JOIN leave_types lt ON lr.leave_type_id = lt.id
           WHERE lr.employee_id = $1 AND lr.tenant_id = $2 AND lr.status = 'approved'
           AND ((lr.start_date <= $3 AND lr.end_date >= $3) OR (lr.start_date <= $4 AND lr.end_date >= $4))`,
          [emp.id, tenantId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
        );
        const leaveRecords = leaveResult.rows;

        const presentDays = attendanceRecords.filter(a => ['PRESENT', 'LATE'].includes(a.status?.toUpperCase())).length;
        const halfDays = attendanceRecords.filter(a => a.status?.toUpperCase() === 'HALF_DAY').length;
        
        let paidLeaveDays = 0;
        let unpaidLeaveDays = 0;
        leaveRecords.forEach(lr => {
          const oStart = new Date(Math.max(new Date(lr.start_date).getTime(), startDate.getTime()));
          const oEnd = new Date(Math.min(new Date(lr.end_date).getTime(), endDate.getTime()));
          const days = Math.max(0, (oEnd.getTime() - oStart.getTime()) / (1000 * 60 * 60 * 24) + 1);
          if (lr.is_paid) paidLeaveDays += days; else unpaidLeaveDays += days;
        });

        const totalDaysInMonth = endDate.getDate();
        const absentDays = Math.max(0, workingDaysSoFar - presentDays - halfDays - (paidLeaveDays + unpaidLeaveDays));

        // 4. Calculate salary (Priority: Body Overrides > Existing Manual > DB Config)
        const isManual = (overrideBasic !== undefined || overrideHra !== undefined || overrideAllowances !== undefined || overrideDeductions !== undefined);
        
        const basic = overrideBasic ?? Number(emp.salary_basic) ?? 0;
        const hra = overrideHra ?? Number(emp.salary_hra) ?? 0;
        const allowances = overrideAllowances ?? Number(emp.salary_allowances) ?? 0;
        const staticDeductions = overrideDeductions ?? Number(emp.salary_deductions) ?? 0;
        
        const totalGross = basic + hra + allowances;
        const perDaySalary = totalGross / (totalDaysInMonth || 30);
        
        const lopDays = absentDays + unpaidLeaveDays + (halfDays * 0.5);
        const lopDeduction = isManual ? 0 : (lopDays * perDaySalary);
        const netSalary = Math.max(0, totalGross - staticDeductions - lopDeduction);

        console.log(`- Gross: ${totalGross}, Net: ${netSalary}, Manual: ${isManual}`);

        // 5. Generate and Save
        const payslipContent = generatePayslipText({
          employeeId: emp.employee_id,
          name: `${emp.first_name || ''} ${emp.last_name || ''}`,
          department: emp.department_name || 'N/A',
          designation: emp.designation_name || 'N/A'
        }, {
          month, year, workingDays: workingDaysTotal, presentDays, halfDays, absentDays, 
          leaveDays: paidLeaveDays + unpaidLeaveDays,
          basic, hra, allowances,
          deductions: staticDeductions + lopDeduction, netSalary,
        });

        const uploadDir = join(process.cwd(), 'uploads', 'payslips', tenantId);
        if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
        const fileName = `payslip_${emp.employee_id}_${year}_${month}.txt`;
        const filePath = join(uploadDir, fileName);
        writeFileSync(filePath, payslipContent);

        await query(
          `INSERT INTO payslip_records (id, user_id, tenant_id, month, year, basic_salary, hra, allowances, deductions, net_salary, working_days, present_days, absent_days, file_path, status, is_manual)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (user_id, month, year) DO UPDATE SET
             basic_salary = EXCLUDED.basic_salary, hra = EXCLUDED.hra,
             allowances = EXCLUDED.allowances, deductions = EXCLUDED.deductions,
             net_salary = EXCLUDED.net_salary, working_days = EXCLUDED.working_days,
             present_days = EXCLUDED.present_days, absent_days = EXCLUDED.absent_days,
             file_path = EXCLUDED.file_path, status = EXCLUDED.status,
             is_manual = EXCLUDED.is_manual`,
          [
            `payslip-${emp.employee_id}-${year}-${month}`,
            emp.employee_id, tenantId, month, year,
            basic, hra, allowances,
            staticDeductions + lopDeduction, netSalary,
            workingDaysTotal, presentDays + halfDays, absentDays + unpaidLeaveDays,
            filePath, 'generated', isManual
          ]
        );

        results.push({ 
          id: `payslip-${emp.employee_id}-${year}-${month}`,
          employee_id: emp.employee_id, 
          employee_name: `${emp.first_name} ${emp.last_name}`,
          net_salary: netSalary,
          status: 'generated'
        });
      } catch (empErr) {
        console.error(`Error generating payroll for ${emp.employee_id}:`, empErr);
      }
    }

    return NextResponse.json({ success: true, message: `Generated ${results.length} payslips`, payslips: results });
  } catch (error) {
    console.error('Generate payslip error:', error);
    return NextResponse.json({ error: 'Failed to generate payslips' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const body = await request.json();
    const { id, basic_salary, hra, allowances, deductions, net_salary, status } = body;

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const result = await query(
      `UPDATE payslip_records SET
        basic_salary = COALESCE($1, basic_salary),
        hra = COALESCE($2, hra),
        allowances = COALESCE($3, allowances),
        deductions = COALESCE($4, deductions),
        net_salary = COALESCE($5, net_salary),
        status = COALESCE($6, status),
        is_manual = TRUE,
        updated_at = NOW()
       WHERE id = $7 AND tenant_id = $8
       RETURNING *`,
      [basic_salary, hra, allowances, deductions, net_salary, status, id, tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, payslip: result.rows[0] });
  } catch (error) {
    console.error('Update payslip error:', error);
    return NextResponse.json({ error: 'Failed to update payslip' }, { status: 500 });
  }
}


function generatePayslipText(
  employee: { employeeId: string; name: string; department: string; designation: string },
  data: {
    month: number; year: number; workingDays: number; presentDays: number;
    halfDays: number; absentDays: number; leaveDays: number;
    basic: number; hra: number; allowances: number; deductions: number; netSalary: number;
  }
): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `PAYSLIP - ${monthNames[data.month - 1]} ${data.year}\nEmp ID: ${employee.employeeId}\nName: ${employee.name}\nNet Salary: ₹${data.netSalary.toFixed(2)}`;
}
