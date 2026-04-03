import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const employeeId = searchParams.get('employeeId');

    // Get payslip records from PostgreSQL
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
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const body = await request.json();
    const { month, year, employeeId } = body;

    // Get employee(s) from PostgreSQL
    let empQuery = 'SELECT * FROM employees WHERE tenant_id = $1 AND is_active = true';
    const empParams: unknown[] = [tenantId];
    if (employeeId) {
      empQuery += ' AND employee_id = $2';
      empParams.push(employeeId);
    }

    const empResult = await query(empQuery, empParams);
    const employees = empResult.rows;
    const results = [];

    for (const emp of employees) {
      // Get attendance for the month from PostgreSQL
      const attendanceResult = await query(
        `SELECT * FROM attendance 
         WHERE tenant_id = $1 AND employee_id = $2 
         AND EXTRACT(MONTH FROM date) = $3 AND EXTRACT(YEAR FROM date) = $4`,
        [tenantId, emp.employee_id, month, year]
      );
      const attendanceRecords = attendanceResult.rows;

      // Calculate working days in the month (exclude weekends)
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      let workingDays = 0;
      const current = new Date(startDate);
      while (current <= endDate) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) workingDays++;
        current.setDate(current.getDate() + 1);
      }

      // Get leave records for the month to distinguish paid vs unpaid
      const leaveResult = await query(
        `SELECT lr.*, lt.is_paid 
         FROM leave_requests lr
         JOIN leave_types lt ON lr.leave_type_id = lt.id
         WHERE lr.employee_id = $1 AND lr.tenant_id = $2 AND lr.status = 'approved'
         AND ((lr.start_date <= $3 AND lr.end_date >= $3) OR (lr.start_date <= $4 AND lr.end_date >= $4))`,
        [emp.employee_id, tenantId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      );
      const leaveRecords = leaveResult.rows;

      const presentDays = attendanceRecords.filter(
        (a) => a.status === 'present' || a.status === 'late'
      ).length;
      const halfDays = attendanceRecords.filter((a) => a.status === 'half-day').length;
      
      // Calculate total leave days in this month
      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;
      
      leaveRecords.forEach(lr => {
        const leaveStart = new Date(lr.start_date);
        const leaveEnd = new Date(lr.end_date);
        const overlapStart = new Date(Math.max(leaveStart.getTime(), startDate.getTime()));
        const overlapEnd = new Date(Math.min(leaveEnd.getTime(), endDate.getTime()));
        const days = Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24) + 1);
        
        if (lr.is_paid) paidLeaveDays += days;
        else unpaidLeaveDays += days;
      });

      const absentDays = Math.max(0, workingDays - presentDays - halfDays - (paidLeaveDays + unpaidLeaveDays));

      // Calculate salary
      const basic = Number(emp.salary_basic) || 0;
      const hra = Number(emp.salary_hra) || 0;
      const allowances = Number(emp.salary_allowances) || 0;
      const deductions = Number(emp.salary_deductions) || 0;
      
      const totalGross = basic + hra + allowances;
      const perDaySalary = totalGross / (workingDays || 30);
      
      // Deductions include Unpaid Leaves (LOP) + Absents
      const totalDeductionDays = absentDays + unpaidLeaveDays + (halfDays * 0.5);
      const absentDeduction = totalDeductionDays * perDaySalary;
      const netSalary = Math.max(0, totalGross - deductions - absentDeduction);

      // Generate simple payslip content
      const payslipContent = generatePayslipText({
        employeeId: emp.employee_id,
        name: emp.name,
        department: emp.department,
        designation: emp.designation
      }, {
        month, year, workingDays, presentDays, halfDays, absentDays, 
        leaveDays: paidLeaveDays + unpaidLeaveDays,
        basic, hra, allowances,
        deductions: deductions + absentDeduction, netSalary,
      });

      // Save payslip file locally
      const uploadDir = join(process.cwd(), 'uploads', 'payslips', tenantId);
      if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
      const fileName = `payslip_${emp.employee_id}_${year}_${month}.txt`;
      const filePath = join(uploadDir, fileName);
      writeFileSync(filePath, payslipContent);

      // Store metadata in PostgreSQL
      const payslipId = `payslip-${emp.employee_id}-${year}-${month}`;
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
          payslipId,
          emp.employee_id, tenantId, month, year,
          basic, hra, allowances,
          deductions + absentDeduction, netSalary,
          workingDays, presentDays + halfDays, absentDays + unpaidLeaveDays,
          filePath, 'generated',
        ]
      );

      results.push({
        employeeId: emp.employee_id,
        name: emp.name,
        netSalary: Math.round(netSalary * 100) / 100,
        workingDays,
        presentDays,
        absentDays,
        filePath,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${results.length} payslips`,
      payslips: results,
    });
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
  return `
═══════════════════════════════════════════════
            PAYSLIP - ${monthNames[data.month - 1]} ${data.year}
═══════════════════════════════════════════════

Employee ID  : ${employee.employeeId}
Name         : ${employee.name}
Department   : ${employee.department}
Designation  : ${employee.designation}

───────────────────────────────────────────────
ATTENDANCE SUMMARY
───────────────────────────────────────────────
Working Days : ${data.workingDays}
Present Days : ${data.presentDays}
Half Days    : ${data.halfDays}
Leave Days   : ${data.leaveDays}
Absent Days  : ${data.absentDays}

───────────────────────────────────────────────
EARNINGS
───────────────────────────────────────────────
Basic Salary : ₹${data.basic.toFixed(2)}
HRA          : ₹${data.hra.toFixed(2)}
Allowances   : ₹${data.allowances.toFixed(2)}
               ─────────────
Gross Salary : ₹${(data.basic + data.hra + data.allowances).toFixed(2)}

───────────────────────────────────────────────
DEDUCTIONS
───────────────────────────────────────────────
Total Deductions : ₹${data.deductions.toFixed(2)}

═══════════════════════════════════════════════
NET SALARY   : ₹${data.netSalary.toFixed(2)}
═══════════════════════════════════════════════

Generated on: ${new Date().toISOString().split('T')[0]}
`;
}
