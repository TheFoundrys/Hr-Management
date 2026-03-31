import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const userRole = request.headers.get('x-user-role') || 'teaching';
    const userId = request.headers.get('x-user-id') || '';

    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    if (userRole === 'admin') {
      const [
        empCountResult,
        todayAttendanceResult,
        pendingLeavesResult,
        recentLeavesResult,
        deptResult,
      ] = await Promise.all([
        query('SELECT COUNT(*) FROM employees WHERE tenant_id = $1 AND is_active = true', [tenantId]),
        query('SELECT status FROM attendance WHERE tenant_id = $1 AND date = $2', [tenantId, today]),
        query("SELECT COUNT(*) FROM leaves WHERE tenant_id = $1 AND status = 'pending'", [tenantId]),
        query('SELECT * FROM leaves WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5', [tenantId]),
        query('SELECT department as _id, COUNT(*) as count FROM employees WHERE tenant_id = $1 AND is_active = true GROUP BY department ORDER BY count DESC', [tenantId]),
      ]);

      const totalEmployees = parseInt(empCountResult.rows[0].count);
      const todayAttendance = todayAttendanceResult.rows;
      const pendingLeaves = parseInt(pendingLeavesResult.rows[0].count);
      const recentLeaves = recentLeavesResult.rows;
      const departmentStats = deptResult.rows;

      const present = todayAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
      const absent = totalEmployees - present;

      // Weekly attendance trend (last 7 days)
      const weeklyTrend = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        
        const dayAttResult = await query(
          'SELECT status FROM attendance WHERE tenant_id = $1 AND date = $2',
          [tenantId, dayStr]
        );
        const dayAtt = dayAttResult.rows;
        const p = dayAtt.filter(a => a.status === 'present' || a.status === 'late').length;

        weeklyTrend.push({
          date: dayStr,
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
          present: p,
          absent: totalEmployees - p,
          late: dayAtt.filter(a => a.status === 'late').length,
        });
      }

      return NextResponse.json({
        success: true,
        dashboard: {
          stats: {
            totalEmployees,
            presentToday: present,
            absentToday: absent,
            pendingLeaves,
            attendanceRate: totalEmployees > 0 ? Math.round((present / totalEmployees) * 100) : 0,
          },
          weeklyTrend,
          departmentStats,
          recentLeaves: recentLeaves.map(l => ({ ...l, employeeId: l.employee_id, leaveType: l.leave_type })),
        },
      });
    }

    // Employee dashboard
    const empResult = await query('SELECT * FROM employees WHERE tenant_id = $1 AND user_id = $2 LIMIT 1', [tenantId, userId]);
    const employee = empResult.rows[0];

    if (!employee) {
       return NextResponse.json({ success: true, dashboard: { stats: { presentDays: 0, absentDays: 0, lateDays: 0, leaveDays: 0, pendingLeaves: 0 }, attendance: [], leaves: [] } });
    }

    const [attResult, leaveResult] = await Promise.all([
      query('SELECT * FROM attendance WHERE tenant_id = $1 AND employee_id = $2 AND date >= $3 ORDER BY date DESC', [tenantId, employee.employee_id, firstOfMonth]),
      query('SELECT * FROM leaves WHERE tenant_id = $1 AND employee_id = $2 ORDER BY created_at DESC LIMIT 10', [tenantId, employee.employee_id]),
    ]);

    const myAttendance = attResult.rows;
    const myLeaves = leaveResult.rows;

    return NextResponse.json({
      success: true,
      dashboard: {
        employee: { ...employee, employeeId: employee.employee_id },
        attendance: myAttendance.map(a => ({ ...a, employeeId: a.employee_id, checkIn: a.check_in, checkOut: a.check_out })),
        leaves: myLeaves.map(l => ({ ...l, employeeId: l.employee_id, leaveType: l.leave_type })),
        stats: {
          presentDays: myAttendance.filter((a) => a.status === 'present' || a.status === 'late').length,
          absentDays: myAttendance.filter((a) => a.status === 'absent').length,
          lateDays: myAttendance.filter((a) => a.status === 'late').length,
          leaveDays: myAttendance.filter((a) => a.status === 'on-leave').length,
          pendingLeaves: myLeaves.filter((l) => l.status === 'pending').length,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
