import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
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
        const empAttendance = attendance.filter((a) => a.employee_id === emp.id);
        const name = `${emp.first_name} ${emp.last_name}`;
        return {
          employeeId: emp.university_id,
          name,
          department: emp.department_id, // Map ID for now or join with departments
          totalPresent: empAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length,
          totalAbsent: empAttendance.filter((a) => a.status === 'ABSENT').length,
          totalLate: empAttendance.filter((a) => a.status === 'LATE').length,
          totalHalfDay: empAttendance.filter((a) => a.status === 'HALF_DAY').length,
          totalLeave: empAttendance.filter((a) => a.status === 'ON_LEAVE').length,
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
