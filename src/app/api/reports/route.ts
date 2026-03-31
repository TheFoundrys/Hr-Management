import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'attendance';
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const format = searchParams.get('format') || 'json';

    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    if (type === 'attendance') {
      const employeesResult = await query('SELECT * FROM employees WHERE tenant_id = $1 AND is_active = true', [tenantId]);
      const attendanceResult = await query(
        `SELECT * FROM attendance 
         WHERE tenant_id = $1 AND date BETWEEN $2 AND $3`,
        [tenantId, startDate, endDate]
      );

      const employees = employeesResult.rows;
      const attendance = attendanceResult.rows;

      const report = employees.map((emp) => {
        const empAttendance = attendance.filter((a) => a.employee_id === emp.employee_id);
        return {
          employeeId: emp.employee_id,
          name: emp.name,
          department: emp.department,
          totalPresent: empAttendance.filter((a) => a.status === 'present' || a.status === 'late').length,
          totalAbsent: empAttendance.filter((a) => a.status === 'absent').length,
          totalLate: empAttendance.filter((a) => a.status === 'late').length,
          totalHalfDay: empAttendance.filter((a) => a.status === 'half-day').length,
          totalLeave: empAttendance.filter((a) => a.status === 'on-leave').length,
          totalHours: empAttendance.reduce((sum, a) => sum + Number(a.working_hours || 0), 0).toFixed(2),
        };
      });

      if (format === 'csv') {
        const headers = 'Employee ID,Name,Department,Present,Absent,Late,Half Day,Leave,Total Hours\n';
        const rows = report
          .map((r) =>
            `${r.employeeId},${r.name},${r.department},${r.totalPresent},${r.totalAbsent},${r.totalLate},${r.totalHalfDay},${r.totalLeave},${r.totalHours}`
          )
          .join('\n');

        return new NextResponse(headers + rows, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=attendance_${year}_${month}.csv`,
          },
        });
      }

      return NextResponse.json({ success: true, report, period: { month, year } });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    console.error('Generate report error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
