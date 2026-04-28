import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';
import { hasPermission } from '@/lib/auth/rbac';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    // Normalize role and handle 'global_admin' as a SUPER_ADMIN equivalent
    let userRole = (request.headers.get('x-user-role') || 'staff').toUpperCase().replace(/-/g, '_');
    
    const userId = request.headers.get('x-user-id') || '';

    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const next30Days = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // --- PLATFORM ADMIN DASHBOARD (Super Admin / Global Admin) ---
    if (userRole === 'SUPER_ADMIN') {
      const [
        tenantsResult,
        totalEmployeesResult,
        recentTenantsResult,
        attendanceTodayResult
      ] = await Promise.all([
        query('SELECT COUNT(*) FROM tenants'),
        query('SELECT COUNT(*) FROM employees'),
        query('SELECT name, tenant_type, created_at FROM tenants ORDER BY created_at DESC LIMIT 5'),
        query('SELECT COUNT(*) FROM attendance WHERE date = $1', [today])
      ]);

      const totalTenants = parseInt(tenantsResult.rows[0].count);

      // Growth trend mock (based on real total)
      const tenantGrowth = [
        { name: 'Apr', count: totalTenants }
      ];

      return NextResponse.json({
        success: true,
        dashboard: {
          isSuperAdmin: true,
          stats: {
            totalTenants: totalTenants,
            totalGlobalEmployees: parseInt(totalEmployeesResult.rows[0].count),
            globalAttendanceToday: parseInt(attendanceTodayResult.rows[0].count),
            systemUptime: '99.9%'
          },
          tenantGrowth,
          recentTenants: recentTenantsResult.rows
        }
      });
    }

    // --- TENANT ADMIN / HR DASHBOARD ---
    if (hasPermission(userRole, 'VIEW_ALL_EMPLOYEES')) {
      const [
        empCountResult,
        todayAttendanceResult,
        pendingLeavesResult,
        recentLeavesResult,
        deptResult,
        liveEventsResult,
        birthdayResult,
      ] = await Promise.all([
        query('SELECT COUNT(*) FROM employees WHERE tenant_id = $1', [tenantId]),
        query('SELECT status FROM attendance WHERE employee_id IN (SELECT id FROM employees WHERE tenant_id = $1) AND date = $2', [tenantId, today]),
        query("SELECT COUNT(*) FROM leave_requests l JOIN employees e ON l.employee_id = e.id WHERE e.tenant_id = $1 AND l.status = 'pending'", [tenantId]),
        query('SELECT l.*, e.university_id FROM leave_requests l JOIN employees e ON l.employee_id = e.id WHERE e.tenant_id = $1 ORDER BY l.created_at DESC LIMIT 5', [tenantId]),
        query('SELECT d.name as _id, COUNT(e.id) as count FROM employees e JOIN departments d ON e.department_id = d.id WHERE e.tenant_id = $1 GROUP BY d.name ORDER BY count DESC', [tenantId]),
        query(`SELECT a.*, e.first_name || ' ' || e.last_name as employee_name, e.university_id as employee_id 
               FROM attendance a 
               JOIN employees e ON a.employee_id = e.id 
               WHERE a.tenant_id = $1 
               ORDER BY a.created_at DESC LIMIT 10`, [tenantId]),
        query(`SELECT first_name, last_name, employee_id, university_id 
               FROM employees 
               WHERE tenant_id = $1 AND is_active = true 
               AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) 
               AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)`, [tenantId]),
      ]);

      const totalEmployees = parseInt(empCountResult.rows[0].count);
      const todayAttendance = todayAttendanceResult.rows;
      const pendingLeaves = parseInt(pendingLeavesResult.rows[0].count);
      const recentLeaves = recentLeavesResult.rows;
      const departmentStats = deptResult.rows;

      const present = todayAttendance.filter((a) => a.status?.toUpperCase() === 'PRESENT' || a.status?.toUpperCase() === 'LATE').length;
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
        const p = dayAtt.filter(a => a.status?.toUpperCase() === 'PRESENT' || a.status?.toUpperCase() === 'LATE').length;

        weeklyTrend.push({
          date: dayStr,
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
          present: p,
          absent: totalEmployees - p,
          late: dayAtt.filter(a => a.status?.toUpperCase() === 'LATE').length,
        });
      }

      const tenantTypeResult = await query('SELECT tenant_type FROM tenants WHERE id = $1', [tenantId]);
      const tenantType = tenantTypeResult.rows[0]?.tenant_type || 'COMPANY';

      return NextResponse.json({
        success: true,
        dashboard: {
          tenantType,
          stats: {
            totalEmployees,
            presentToday: present,
            absentToday: absent,
            pendingLeaves,
            attendanceRate: totalEmployees > 0 ? Math.round((present / totalEmployees) * 100) : 0,
          },
          weeklyTrend,
          departmentStats,
          liveEvents: liveEventsResult.rows.map((a: any) => ({
            employeeId: a.employee_id,
            employeeName: a.employee_name,
            type: a.check_out ? 'check_out' : 'check_in',
            timestamp: a.created_at
          })),
          recentLeaves: recentLeaves.map(l => ({ 
            ...l, 
            employeeId: l.university_id, 
            leaveType: (l.type_name || 'General'),
            status: (l.status || 'pending').toLowerCase()
          })),
          birthdaysToday: birthdayResult.rows.map((e: any) => ({
            name: `${e.first_name} ${e.last_name}`,
            employeeId: e.employee_id || e.university_id
          })),
          holidays: (await query(`
            SELECT name, date 
            FROM holidays 
            WHERE tenant_id = $1 AND date >= CURRENT_DATE 
            ORDER BY date ASC LIMIT 5`, [tenantId])).rows,
          upcomingBirthdays: (await query(`
            SELECT first_name, last_name, employee_id, university_id, 
                   EXTRACT(DAY FROM date_of_birth) as day, 
                   EXTRACT(MONTH FROM date_of_birth) as month
            FROM employees 
            WHERE tenant_id = $1 AND is_active = true AND date_of_birth IS NOT NULL
            AND (
              (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM date_of_birth) > EXTRACT(DAY FROM CURRENT_DATE))
              OR 
              (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month') AND EXTRACT(DAY FROM date_of_birth) <= EXTRACT(DAY FROM CURRENT_DATE))
            )
            ORDER BY month ASC, day ASC LIMIT 10`, [tenantId])).rows.map((e: any) => ({
              name: `${e.first_name} ${e.last_name}`,
              date: `${String(e.day).padStart(2, '0')} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][e.month - 1]}`
            })),
          onLeaveToday: (await query(`
            SELECT 
              e.first_name || ' ' || e.last_name as name,
              a.status
            FROM employees e
            LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = CURRENT_DATE
            WHERE e.tenant_id = $1 AND e.is_active = true
            AND (a.status IS NULL OR a.status NOT IN ('PRESENT', 'LATE'))
            LIMIT 20`, [tenantId])).rows.map((e: any) => ({
              name: e.name,
              avatar: e.name.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
              status: e.status === 'ON_LEAVE' ? 'ON-LEAVE' : 'ABSENT'
            })),
          praises: (await query(`
            SELECT p.*, 
                   f.first_name || ' ' || f.last_name as from, 
                   t.first_name || ' ' || t.last_name as to,
                   (SELECT COUNT(*) FROM praise_likes pl WHERE pl.praise_id = p.id) as likes_count
            FROM praises p
            JOIN employees f ON p.from_employee_id = f.id
            JOIN employees t ON p.to_employee_id = t.id
            WHERE p.tenant_id = $1
            ORDER BY p.created_at DESC LIMIT 10`, [tenantId])).rows.map((p: any) => ({
              id: p.id,
              from: p.from,
              to: p.to,
              title: p.title,
              message: p.message,
              timestamp: new Date(p.created_at).toLocaleDateString(),
              reactions: parseInt(p.likes_count) || 0,
              comments: 0
            })),
          allEmployees: (await query('SELECT id, first_name, last_name FROM employees WHERE tenant_id = $1 AND is_active = true ORDER BY first_name ASC', [tenantId])).rows,
        },
      });
    }

    // --- EMPLOYEE DASHBOARD ---
    const userResult = await query('SELECT employee_id FROM users WHERE id = $1', [userId]);
    const empIdStr = userResult.rows[0]?.employee_id;

    if (!empIdStr) {
       return NextResponse.json({ success: true, dashboard: { stats: { presentDays: 0, absentDays: 0, lateDays: 0, leaveDays: 0, pendingLeaves: 0 }, attendance: [], leaves: [] } });
    }

    const empResult = await query('SELECT * FROM employees WHERE tenant_id = $1 AND employee_id = $2 LIMIT 1', [tenantId, empIdStr]);
    const employee = empResult.rows[0];

    if (!employee) {
       return NextResponse.json({ success: true, dashboard: { stats: { presentDays: 0, absentDays: 0, lateDays: 0, leaveDays: 0, pendingLeaves: 0 }, attendance: [], leaves: [] } });
    }

    const [attResult, leaveResult, birthdayResult, balancesResult] = await Promise.all([
      query('SELECT * FROM attendance WHERE employee_id = $1 AND date >= $2 ORDER BY date DESC', [employee.id, firstOfMonth]),
      query('SELECT l.*, lt.name as type_name FROM leave_requests l JOIN leave_types lt ON l.leave_type_id = lt.id WHERE l.employee_id = $1 ORDER BY l.created_at DESC LIMIT 10', [employee.id]),
      query(`SELECT first_name, last_name, employee_id, university_id 
             FROM employees 
             WHERE tenant_id = $1 AND is_active = true 
             AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) 
             AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)`, [tenantId]),
      query(`SELECT lt.name, lb.allocated_days - lb.used_days as remaining 
             FROM leave_balances lb 
             JOIN leave_types lt ON lb.leave_type_id = lt.id 
             WHERE lb.employee_id = $1`, [employee.id]),
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
          presentDays: myAttendance.filter((a) => a.status?.toLowerCase() === 'present' || a.status?.toLowerCase() === 'late').length,
          absentDays: myAttendance.filter((a) => a.status?.toLowerCase() === 'absent').length,
          lateDays: myAttendance.filter((a) => a.status?.toLowerCase() === 'late').length,
          pendingLeaves: myLeaves.filter((l) => l.status?.toLowerCase() === 'pending').length,
        },
        birthdaysToday: birthdayResult.rows.map((e: any) => ({
          name: `${e.first_name} ${e.last_name}`,
          employeeId: e.employee_id || e.university_id
        })),
        leaveBalances: balancesResult.rows,
        holidays: (await query(`
          SELECT name, date 
          FROM holidays 
          WHERE tenant_id = $1 AND date >= CURRENT_DATE 
          ORDER BY date ASC LIMIT 5`, [tenantId])).rows,
        upcomingBirthdays: (await query(`
          SELECT first_name, last_name, employee_id, university_id, 
                 EXTRACT(DAY FROM date_of_birth) as day, 
                 EXTRACT(MONTH FROM date_of_birth) as month
          FROM employees 
          WHERE tenant_id = $1 AND is_active = true AND date_of_birth IS NOT NULL
          AND (
            (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM date_of_birth) > EXTRACT(DAY FROM CURRENT_DATE))
            OR 
            (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month') AND EXTRACT(DAY FROM date_of_birth) <= EXTRACT(DAY FROM CURRENT_DATE))
          )
          ORDER BY month ASC, day ASC LIMIT 10`, [tenantId])).rows.map((e: any) => ({
            name: `${e.first_name} ${e.last_name}`,
            date: `${String(e.day).padStart(2, '0')} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][e.month - 1]}`
          })),
        onLeaveToday: (await query(`
          SELECT 
            e.first_name || ' ' || e.last_name as name,
            a.status
          FROM employees e
          LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = CURRENT_DATE
          WHERE e.tenant_id = $1 AND e.is_active = true
          AND (a.status IS NULL OR a.status NOT IN ('PRESENT', 'LATE'))
          LIMIT 20`, [tenantId])).rows.map((e: any) => ({
            name: e.name,
            avatar: e.name.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
            status: e.status === 'ON_LEAVE' ? 'ON-LEAVE' : 'ABSENT'
          })),
        praises: (await query(`
          SELECT p.*, 
                 f.first_name || ' ' || f.last_name as from, 
                 t.first_name || ' ' || t.last_name as to,
                 (SELECT COUNT(*) FROM praise_likes pl WHERE pl.praise_id = p.id) as likes_count
          FROM praises p
          JOIN employees f ON p.from_employee_id = f.id
          JOIN employees t ON p.to_employee_id = t.id
          WHERE p.tenant_id = $1
          ORDER BY p.created_at DESC LIMIT 10`, [tenantId])).rows.map((p: any) => ({
            id: p.id,
            from: p.from,
            to: p.to,
            title: p.title,
            message: p.message,
            timestamp: new Date(p.created_at).toLocaleDateString(),
            reactions: parseInt(p.likes_count) || 0,
            comments: 0
          })),
        allEmployees: (await query('SELECT id, first_name, last_name FROM employees WHERE tenant_id = $1 AND is_active = true ORDER BY first_name ASC', [tenantId])).rows,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
