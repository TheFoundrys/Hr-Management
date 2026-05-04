import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';
import { hasPermission } from '@/lib/auth/rbac';
import { DEFAULT_LEAVE_POLICY, type LeavePolicySettings } from '@/lib/types/tenant';
import { sendNewLeaveRequestToManagers } from '@/lib/mail/leaveNotifications';

function calendarLeadDays(startYmd: string): number {
  const [y, m, d] = startYmd.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((start.getTime() - today.getTime()) / 86400000);
}

function mergeLeavePolicy(
  settings: Record<string, unknown> | null | undefined
): Required<
  Pick<
    LeavePolicySettings,
    | 'advance_notice_days'
    | 'max_consecutive_days'
    | 'dept_max_concurrent_approved'
    | 'sick_leave_max_days_without_certificate'
  >
> {
  const lp = settings?.leave_policy as LeavePolicySettings | undefined;
  return {
    ...DEFAULT_LEAVE_POLICY,
    ...(lp || {}),
  };
}

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const { searchParams } = new URL(request.url);
    let employeeId = searchParams.get('employeeId');
    let status = searchParams.get('status');
    const userRole = request.headers.get('x-user-role') || '';
    
    const canManageLeave = hasPermission(userRole, 'MANAGE_LEAVE');

    // Security: If not an approver/admin, force their own employeeId
    if (!canManageLeave) {
      if (!employeeId) return NextResponse.json({ error: 'Permission denied: Missing scope' }, { status: 403 });
    }

    const params: any[] = [tenantId];
    let queryStr = `SELECT lr.*, lt.name as type_name, e.first_name, e.last_name, e.employee_id as emp_string_id
       FROM leave_requests lr
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       JOIN employees e ON lr.employee_id = e.id
       WHERE lr.tenant_id = $1`;

    if (employeeId) {
      params.push(employeeId);
      queryStr += ` AND (e.id::text = $${params.length} OR e.employee_id = $${params.length} OR e.university_id = $${params.length})`;
    }

    if (status) {
      params.push(status);
      queryStr += ` AND lr.status = $${params.length}`;
    }

    queryStr += ` ORDER BY lr.created_at DESC`;

    const result = await query(queryStr, params);

    return NextResponse.json({ success: true, requests: result.rows });
  } catch (error) {
    console.error('Fetch leave requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const body = await request.json();
    const { employeeId, leaveTypeId, startDate, endDate, reason, isHalfDay, halfDayType, substitutionEmployeeId, attachmentUrl } = body;

    // 0. Auto-Onboarding Check: Ensure employee record exists
    let activeEmployeeUuid = null;
    let activeDeptId = null;

    let empResult = await query('SELECT id, department_id FROM employees WHERE (employee_id = $1 OR university_id = $1) AND tenant_id = $2', [employeeId, tenantId]);
    
    // If employee record is missing, try to create it using User session info
    if (empResult.rowCount === 0) {
      // Find the user to get their details (match by either their null employee_id or the specific one provided)
      const userResult = await query('SELECT id, name, email FROM users WHERE (employee_id = $1 OR employee_id IS NULL) AND tenant_id = $2 LIMIT 1', [employeeId, tenantId]);
      
      if (userResult.rowCount && userResult.rowCount > 0) {
        const user = userResult.rows[0];
        const names = user.name.split(' ');
        const firstName = names[0];
        const lastName = names.slice(1).join(' ') || 'User';
        const newEmpId = `TFU-AUTO-${Date.now().toString().slice(-6)}`;
        const defaultDept = '0bd710c2-bb92-4c77-a67f-013573f25cc0';

        // Create the employee record
        const insertRes = await query(
          `INSERT INTO employees (employee_id, university_id, first_name, last_name, email, tenant_id, department_id, user_id, is_active)
           VALUES ($1, $1, $2, $3, $4, $5, $6, $7, true) RETURNING id`,
          [newEmpId, firstName, lastName, user.email, tenantId, defaultDept, user.id]
        );
        activeEmployeeUuid = insertRes.rows[0].id;

        // Link the user record
        await query('UPDATE users SET employee_id = $1, is_active = true WHERE id = $2', [newEmpId, user.id]);
        
        activeDeptId = defaultDept;
      } else {
        return NextResponse.json({ error: 'Personnel identity not found. Please re-login.' }, { status: 404 });
      }
    } else {
      activeEmployeeUuid = empResult.rows[0].id;
      activeDeptId = empResult.rows[0].department_id;
    }

    const tenantSettingsRes = await query('SELECT settings FROM tenants WHERE id = $1', [tenantId]);
    const settingsRow = tenantSettingsRes.rows[0]?.settings;
    const settingsParsed =
      typeof settingsRow === 'string' ? JSON.parse(settingsRow) : settingsRow || {};
    const leavePolicy = mergeLeavePolicy(settingsParsed as Record<string, unknown>);

    // 1. Calculate total days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = isHalfDay ? 0.5 : (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;

    if (totalDays <= 0) return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });

    const leadDays = calendarLeadDays(startDate);
    if (leadDays < leavePolicy.advance_notice_days) {
      return NextResponse.json(
        {
          error: `Leave must be applied at least ${leavePolicy.advance_notice_days} calendar day(s) before the start date.`,
        },
        { status: 400 }
      );
    }

    if (
      leavePolicy.max_consecutive_days > 0 &&
      totalDays > leavePolicy.max_consecutive_days
    ) {
      return NextResponse.json(
        {
          error: `This request exceeds the maximum of ${leavePolicy.max_consecutive_days} consecutive day(s) per application.`,
        },
        { status: 400 }
      );
    }

    const typeMeta = await query(
      `SELECT UPPER(TRIM(code)) as code, LOWER(name) as name FROM leave_types WHERE id = $1 AND tenant_id = $2`,
      [leaveTypeId, tenantId]
    );
    const ltRow = typeMeta.rows[0];
    const isSickLike =
      ltRow &&
      (ltRow.code === 'SL' ||
        String(ltRow.name || '').includes('sick') ||
        String(ltRow.name || '').includes('medical'));
    if (
      isSickLike &&
      totalDays > leavePolicy.sick_leave_max_days_without_certificate &&
      !String(attachmentUrl || '').trim()
    ) {
      return NextResponse.json(
        {
          error: `Sick leave over ${leavePolicy.sick_leave_max_days_without_certificate} day(s) requires an attachment or medical certificate reference.`,
        },
        { status: 400 }
      );
    }

    // 2. Self-Healing Balance initialization
    let balanceResult = await query(
      `SELECT remaining_days FROM leave_balances 
       WHERE employee_id = $1 AND leave_type_id = $2 AND tenant_id = $3 AND year = $4`,
      [activeEmployeeUuid, leaveTypeId, tenantId, new Date().getFullYear()]
    );

    if (balanceResult.rowCount === 0) {
      const allTypes = await query('SELECT id, annual_quota FROM leave_types WHERE tenant_id = $1', [tenantId]);
      for (const lt of allTypes.rows) {
        await query(
          `INSERT INTO leave_balances (employee_id, leave_type_id, tenant_id, year, allocated_days, used_days, remaining_days, accrued_so_far)
           VALUES ($1, $2, $3, $4, $5, 0, $5, $5)
           ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING`,
          [activeEmployeeUuid, lt.id, tenantId, new Date().getFullYear(), lt.annual_quota]
        );
      }
      balanceResult = await query(
        `SELECT remaining_days FROM leave_balances 
         WHERE employee_id = $1 AND leave_type_id = $2 AND tenant_id = $3 AND year = $4`,
        [activeEmployeeUuid, leaveTypeId, tenantId, new Date().getFullYear()]
      );
    }

    if (balanceResult.rowCount === 0 || Number(balanceResult.rows[0].remaining_days) < totalDays) {
      return NextResponse.json({ error: 'Insufficient leave balance' }, { status: 400 });
    }

    // 3. Quota check
    const quotaResult = await query(
      `SELECT COUNT(*) as count FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE e.department_id = $1 AND lr.tenant_id = $2 AND lr.status = 'approved'
       AND (
        (lr.start_date <= $3 AND lr.end_date >= $3) OR
        (lr.start_date <= $4 AND lr.end_date >= $4) OR
        (lr.start_date >= $3 AND lr.end_date <= $4)
       )`,
      [activeDeptId, tenantId, startDate, endDate]
    );

    const concurrentApproved = Number(quotaResult.rows[0]?.count || 0);
    if (concurrentApproved >= leavePolicy.dept_max_concurrent_approved) {
      return NextResponse.json(
        {
          error: `Departmental leave quota exceeded (max ${leavePolicy.dept_max_concurrent_approved} overlapping approved leave(s) for this period).`,
        },
        { status: 400 }
      );
    }

    // 4. Overlap check
    const overlapResult = await query(
      `SELECT id FROM leave_requests 
       WHERE employee_id = $1 AND tenant_id = $2 AND status != 'rejected' AND status != 'cancelled'
       AND (
        (start_date <= $3 AND end_date >= $3) OR
        (start_date <= $4 AND end_date >= $4) OR
        (start_date >= $3 AND end_date <= $4)
       )`,
      [activeEmployeeUuid, tenantId, startDate, endDate]
    );

    if (overlapResult.rowCount && overlapResult.rowCount > 0) {
      return NextResponse.json({ error: 'Overlapping request detected' }, { status: 400 });
    }

    // 4b. Resolve Substitution UUID
    let substitutionUuid = null;
    if (substitutionEmployeeId) {
      const subRes = await query('SELECT id FROM employees WHERE (employee_id = $1 OR university_id = $1) AND tenant_id = $2', [substitutionEmployeeId, tenantId]);
      if (subRes.rowCount && subRes.rowCount > 0) {
        substitutionUuid = subRes.rows[0].id;
      }
    }

    // 5. Create request
    const result = await query(
      `INSERT INTO leave_requests (
        employee_id, leave_type_id, tenant_id, start_date, end_date, total_days, reason, 
        is_half_day, half_day_type, substitution_employee_id, attachment_url, current_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1)
      RETURNING *`,
      [activeEmployeeUuid, leaveTypeId, tenantId, startDate, endDate, totalDays, reason, isHalfDay, halfDayType, substitutionUuid, attachmentUrl]
    );

    const [tenantRow, empRow, approversRes] = await Promise.all([
      query('SELECT name FROM tenants WHERE id = $1', [tenantId]),
      query('SELECT first_name, last_name FROM employees WHERE id = $1', [activeEmployeeUuid]),
      query(
        `SELECT DISTINCT TRIM(email) AS email FROM users
         WHERE tenant_id = $1 AND COALESCE(is_active, true) = true
         AND email IS NOT NULL AND TRIM(email) <> ''
         AND UPPER(REPLACE(role::text, '-', '_')) IN (
           'SUPER_ADMIN','GLOBAL_ADMIN','ADMIN','HR_MANAGER','HR','HR_EXECUTIVE',
           'MANAGER','HOD','PRINCIPAL','DIRECTOR'
         )`,
        [tenantId]
      ),
    ]);
    const tenantName = tenantRow.rows[0]?.name || 'HR Portal';
    const er = empRow.rows[0];
    const employeeName = `${er?.first_name || ''} ${er?.last_name || ''}`.trim() || 'Employee';
    const managerEmails = approversRes.rows
      .map((r: { email?: string }) => String(r.email || '').trim())
      .filter((e: string) => e.includes('@'));
    const leaveTypeLabel = ltRow?.name ? String(ltRow.name).replace(/\b\w/g, (c) => c.toUpperCase()) : 'Leave';

    await sendNewLeaveRequestToManagers({
      managerEmails,
      tenantName,
      employeeName,
      leaveTypeName: leaveTypeLabel,
      startDate: String(startDate).slice(0, 10),
      endDate: String(endDate).slice(0, 10),
      totalDays,
      reason: reason ?? null,
    });

    return NextResponse.json({ success: true, request: result.rows[0] });
  } catch (error) {
    console.error('Apply leave error:', error);
    return NextResponse.json({ error: 'Internal server failure. Contact support.' }, { status: 500 });
  }
}
