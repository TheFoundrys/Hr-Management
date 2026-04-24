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
      ? `WHERE tenant_id = $1 AND month = $2 AND year = $3 AND user_id = $4`
      : `WHERE tenant_id = $1 AND month = $2 AND year = $3`;
    const params = employeeId ? [tenantId, month, year, employeeId] : [tenantId, month, year];

    const result = await query(`SELECT * FROM payslip_records ${filter} ORDER BY generated_at DESC`, params);

    return NextResponse.json({ success: true, payslips: result.rows });
  } catch (error) {
    console.error('Get payslips error:', error);
    return NextResponse.json({ error: 'Failed to fetch payslips' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 0. SELF-REPAIR: Ensure leave_types table has the required is_paid column for payroll
    await query(`ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT TRUE`);

    const tenantId = await getTenantId(request);
    const body = await request.json();
    const { month, year, employeeId } = body;

    let empQuery = 'SELECT * FROM employees WHERE tenant_id = $1 AND is_active = true';
    const empParams: unknown[] = [tenantId];
    if (employeeId) {
      empQuery += ' AND employee_id = $2';
      empParams.push(employeeId);
    }

    const empResult = await query(empQuery, empParams);
    const employees = empResult.rows;
    const results = [];
    const today = new Date();

    for (const emp of employees) {
      // 1. Get attendance using UUID (emp.id)
      const attendanceResult = await query(
        `SELECT * FROM attendance 
         WHERE tenant_id = $1 AND employee_id = $2 
         AND EXTRACT(MONTH FROM date) = $3 AND EXTRACT(YEAR FROM date) = $4`,
        [tenantId, emp.id, month, year]
      );
      const attendanceRecords = attendanceResult.rows;

      // 2. Calculate working days (Total month vs So Far)
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

      // 3. Get leave records using UUID (emp.id)
      const leaveResult = await query(
        `SELECT lr.*, lt.is_paid 
         FROM leave_requests lr
         JOIN leave_types lt ON lr.leave_type_id = lt.id
         WHERE lr.employee_id = $1 AND lr.tenant_id = $2 AND lr.status = 'approved'
         AND ((lr.start_date <= $3 AND lr.end_date >= $3) OR (lr.start_date <= $4 AND lr.end_date >= $4))`,
        [emp.id, tenantId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      );
      const leaveRecords = leaveResult.rows;

      const presentDays = attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length;
      const halfDays = attendanceRecords.filter(a => a.status === 'half-day').length;
      
      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;
      
      leaveRecords.forEach(lr => {
        const leaveStart = new Date(lr.start_date);
        const leaveEnd = new Date(lr.end_date);
        const oStart = new Date(Math.max(leaveStart.getTime(), startDate.getTime()));
        const oEnd = new Date(Math.min(leaveEnd.getTime(), endDate.getTime()));
        const days = Math.max(0, (oEnd.getTime() - oStart.getTime()) / (1000 * 60 * 60 * 24) + 1);
        
        if (lr.is_paid) paidLeaveDays += days; else unpaidLeaveDays += days;
      });

      // ONLY count as absent if the day has already passed
      const absentDays = Math.max(0, workingDaysSoFar - presentDays - halfDays - (paidLeaveDays + unpaidLeaveDays));

      // 4. Calculate salary
      const basic = Number(emp.salary_basic) || 0;
      const hra = Number(emp.salary_hra) || 0;
      const allowances = Number(emp.salary_allowances) || 0;
      const staticDeductions = Number(emp.salary_deductions) || 0;
      
      const totalGross = basic + hra + allowances;
      const perDaySalary = totalGross / (workingDaysTotal || 30);
      
      // Deductions = LOP (unpaid leave) + Absents (passed days) + Half-day penalties
      const totalDeductionDays = absentDays + unpaidLeaveDays + (halfDays * 0.5);
      const absentDeduction = totalDeductionDays * perDaySalary;
      const netSalary = Math.max(0, totalGross - staticDeductions - absentDeduction);

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
        deductions: staticDeductions + absentDeduction, netSalary,
      });

      const uploadDir = join(process.cwd(), 'uploads', 'payslips', tenantId);
      if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
      const fileName = `payslip_${emp.employee_id}_${year}_${month}.txt`;
      const filePath = join(uploadDir, fileName);
      writeFileSync(filePath, payslipContent);

      await query(
        `INSERT INTO payslip_records (id, user_id, tenant_id, month, year, basic_salary, hra, allowances, deductions, net_salary, working_days, present_days, absent_days, file_path, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (user_id, month, year) DO UPDATE SET
           basic_salary = EXCLUDED.basic_salary, hra = EXCLUDED.hra,
           allowances = EXCLUDED.allowances, deductions = EXCLUDED.deductions,
           net_salary = EXCLUDED.net_salary, working_days = EXCLUDED.working_days,
           present_days = EXCLUDED.present_days, absent_days = EXCLUDED.absent_days,
           file_path = EXCLUDED.file_path, status = EXCLUDED.status`,
        [
          `payslip-${emp.employee_id}-${year}-${month}`,
          emp.employee_id, tenantId, month, year,
          basic, hra, allowances,
          staticDeductions + absentDeduction, netSalary,
          workingDaysTotal, presentDays + halfDays, absentDays + unpaidLeaveDays,
          filePath, 'generated'
        ]
      );

      results.push({ employeeId: emp.employee_id, name: emp.first_name, netSalary: Math.round(netSalary * 100) / 100 });
    }

    return NextResponse.json({ success: true, message: `Generated ${results.length} payslips`, payslips: results });
  } catch (error) {
    console.error('Generate payslip error:', error);
    return NextResponse.json({ error: 'Failed to generate payslips' }, { status: 500 });
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
