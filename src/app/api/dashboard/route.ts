import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const userRole = request.headers.get('x-user-role') || 'teaching';
    const userId = request.headers.get('x-user-id') || '';

    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    if (userRole.toLowerCase() === 'admin') {
      const [
        empCountResult,
        todayAttendanceResult,
        pendingLeavesResult,
        recentLeavesResult,
        deptResult,
      ] = await Promise.all([
        query('SELECT COUNT(*) FROM employees WHERE tenant_id = $1', [tenantId]),
        query('SELECT status FROM attendance WHERE employee_id IN (SELECT id FROM employees WHERE tenant_id = $1) AND date = $2', [tenantId, today]),
        query("SELECT COUNT(*) FROM leaves l JOIN employees e ON l.employee_id = e.id WHERE e.tenant_id = $1 AND l.status = 'PENDING'", [tenantId]),
        query('SELECT l.*, e.university_id FROM leaves l JOIN employees e ON l.employee_id = e.id WHERE e.tenant_id = $1 ORDER BY l.created_at DESC LIMIT 5', [tenantId]),
        query('SELECT d.name as _id, COUNT(e.id) as count FROM employees e JOIN departments d ON e.department_id = d.id WHERE e.tenant_id = $1 GROUP BY d.name ORDER BY count DESC', [tenantId]),
      ]);

      const totalEmployees = parseInt(empCountResult.rows[0].count);
      const todayAttendance = todayAttendanceResult.rows;
      const pendingLeaves = parseInt(pendingLeavesResult.rows[0].count);
      const recentLeaves = recentLeavesResult.rows;
      const departmentStats = deptResult.rows;

      const present = todayAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
      const absent = totalEmployees - present;

      // Weekly attendance trend (last 7 days)
      const weeklyTrend = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        
        const dayAttResult = await query(
          'SELECT status FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE e.tenant_id = $1 AND a.date = $2',
          [tenantId, dayStr]
        );
        const dayAtt = dayAttResult.rows;
        const p = dayAtt.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;

        weeklyTrend.push({
          date: dayStr,
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
          present: p,
          absent: totalEmployees - p,
          late: dayAtt.filter(a => a.status === 'LATE').length,
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
          recentLeaves: recentLeaves.map(l => ({ 
            ...l, 
            employeeId: l.university_id, // Use bridge ID for frontend
            leaveType: l.leave_type.toLowerCase(),
            status: l.status.toLowerCase()
          })),
        },
      });
    }

    // Employee dashboard
    const userResult = await query('SELECT employee_id FROM users WHERE id = $1', [userId]);
    const empIdStr = userResult.rows[0]?.employee_id;

    if (!empIdStr) {
       return NextResponse.json({ success: true, dashboard: { stats: { presentDays: 0, absentDays: 0, lateDays: 0, leaveDays: 0, pendingLeaves: 0 }, attendance: [], leaves: [] } });
    }

    // Get employee details using the bridge ID
    const empResult = await query('SELECT * FROM employees WHERE tenant_id = $1 AND employee_id = $2 LIMIT 1', [tenantId, empIdStr]);
    const employee = empResult.rows[0];

    if (!employee) {
       return NextResponse.json({ success: true, dashboard: { stats: { presentDays: 0, absentDays: 0, lateDays: 0, leaveDays: 0, pendingLeaves: 0 }, attendance: [], leaves: [] } });
    }

    const [attResult, leaveResult] = await Promise.all([
      query('SELECT * FROM attendance WHERE employee_id = $1 AND date >= $2 ORDER BY date DESC', [employee.id, firstOfMonth]),
      query('SELECT l.*, lt.name as type_name FROM leave_requests l JOIN leave_types lt ON l.leave_type_id = lt.id WHERE l.employee_id = $1 ORDER BY l.created_at DESC LIMIT 10', [empIdStr]),
    ]);

    const myAttendance = attResult.rows;
    const myLeaves = leaveResult.rows;

    return NextResponse.json({
      success: true,
      dashboard: {
        employee: { ...employee, employeeId: employee.employee_id },
        attendance: myAttendance.map(a => ({ 
          ...a, 
          employeeId: employee.employee_id, 
          checkIn: a.check_in, 
          checkOut: a.check_out 
        })),
        leaves: myLeaves.map(l => ({ 
          ...l, 
          employeeId: employee.employee_id, 
          leaveType: l.type_name,
          status: l.status.toLowerCase()
        })),
        stats: {
          presentDays: myAttendance.filter((a) => a.status === 'present' || a.status === 'late').length,
          absentDays: myAttendance.filter((a) => a.status === 'absent').length,
          lateDays: myAttendance.filter((a) => a.status === 'late').length,
          leaveDays: myAttendance.filter((a) => a.status === 'on-leave' || a.status === 'leave').length,
          pendingLeaves: myLeaves.filter((l) => l.status === 'pending').length,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
