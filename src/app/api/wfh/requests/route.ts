import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/auth/rbac';
import { sendNewWfhRequestToManagers } from '@/lib/mail/leaveNotifications';

const WF_WEEK_MAX = 5;

async function resolveEmployeeUuid(
  tenantId: string,
  payload: { internalEmployeeId?: string; userId?: string; email?: string }
) {
  if (payload.internalEmployeeId) {
    const r = await query(
      `SELECT id FROM employees WHERE tenant_id = $2
       AND (id::text = $1 OR employee_id::text = $1 OR university_id::text = $1) LIMIT 1`,
      [payload.internalEmployeeId, tenantId]
    );
    if (r.rows[0]) return r.rows[0].id as string;
  }
  if (payload.userId) {
    const r = await query('SELECT id FROM employees WHERE user_id = $1::uuid AND tenant_id = $2', [
      payload.userId,
      tenantId,
    ]);
    if (r.rows[0]) return r.rows[0].id as string;
  }
  if (payload.email) {
    const r = await query('SELECT id FROM employees WHERE email = $1 AND tenant_id = $2 LIMIT 1', [
      payload.email,
      tenantId,
    ]);
    if (r.rows[0]) return r.rows[0].id as string;
  }
  return null;
}

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const role = payload.role || '';
    const employeeId = await resolveEmployeeUuid(tenantId, payload);
    if (!employeeId) return NextResponse.json({ success: true, mine: [], pendingApprovals: [], weekDaysUsed: 0, weekMax: WF_WEEK_MAX });

    const mine = await query(
      `SELECT * FROM wfh_requests WHERE tenant_id = $1 AND employee_id = $2 ORDER BY request_date DESC, created_at DESC LIMIT 50`,
      [tenantId, employeeId]
    );

    let pendingApprovals: unknown[] = [];
    if (hasPermission(role, 'MANAGE_LEAVE')) {
      const p = await query(
        `SELECT w.*, e.first_name, e.last_name, e.employee_id as emp_string_id
         FROM wfh_requests w
         JOIN employees e ON e.id = w.employee_id
         WHERE w.tenant_id = $1 AND w.status = 'pending'
         ORDER BY w.created_at ASC`,
        [tenantId]
      );
      pendingApprovals = p.rows;
    }

    const weekSum = await query(
      `SELECT COALESCE(SUM(CASE WHEN is_half_day THEN 0.5 ELSE 1.0 END), 0)::numeric AS d
       FROM wfh_requests
       WHERE employee_id = $1 AND tenant_id = $2
       AND status IN ('pending', 'approved')
       AND request_date >= date_trunc('week', CURRENT_DATE)::date
       AND request_date < (date_trunc('week', CURRENT_DATE) + interval '7 days')::date`,
      [employeeId, tenantId]
    );
    const weekDaysUsed = Number(weekSum.rows[0]?.d || 0);

    return NextResponse.json({
      success: true,
      mine: mine.rows,
      pendingApprovals,
      weekDaysUsed,
      weekMax: WF_WEEK_MAX,
    });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === '42P01') {
      return NextResponse.json(
        { error: 'WFH is not set up yet. Run migrations/add_wfh_requests.sql on the database.' },
        { status: 503 }
      );
    }
    console.error('wfh GET', e);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { requestDate, isHalfDay, halfDayType, reason } = body;
    if (!requestDate) return NextResponse.json({ error: 'requestDate required' }, { status: 400 });

    const employeeUuid = await resolveEmployeeUuid(tenantId, payload);
    if (!employeeUuid) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });

    const ymd = String(requestDate).slice(0, 10);
    const today = new Date().toISOString().split('T')[0];
    if (ymd < today) {
      return NextResponse.json({ error: 'Past dates are not allowed for WFH self-service' }, { status: 400 });
    }

    const dup = await query(
      `SELECT id FROM wfh_requests WHERE employee_id = $1 AND request_date = $2::date AND status IN ('pending','approved')`,
      [employeeUuid, ymd]
    );
    if (dup.rowCount) return NextResponse.json({ error: 'You already have WFH for this date' }, { status: 400 });

    const weekSum = await query(
      `SELECT COALESCE(SUM(CASE WHEN is_half_day THEN 0.5 ELSE 1.0 END), 0)::numeric AS d
       FROM wfh_requests
       WHERE employee_id = $1 AND tenant_id = $2
       AND status IN ('pending', 'approved')
       AND request_date >= date_trunc('week', $3::date)::date
       AND request_date < (date_trunc('week', $3::date) + interval '7 days')::date`,
      [employeeUuid, tenantId, ymd]
    );
    const add = isHalfDay ? 0.5 : 1;
    if (Number(weekSum.rows[0]?.d || 0) + add > WF_WEEK_MAX) {
      return NextResponse.json(
        { error: `WFH is limited to ${WF_WEEK_MAX} day equivalents per calendar week` },
        { status: 400 }
      );
    }

    const ins = await query(
      `INSERT INTO wfh_requests (tenant_id, employee_id, request_date, is_half_day, half_day_type, reason, status)
       VALUES ($1, $2, $3::date, $4, $5, $6, 'pending') RETURNING *`,
      [tenantId, employeeUuid, ymd, !!isHalfDay, isHalfDay ? halfDayType || 'morning' : null, reason || null]
    );
    const row = ins.rows[0];

    const [tenantRow, empRow, approversRes] = await Promise.all([
      query('SELECT name FROM tenants WHERE id = $1', [tenantId]),
      query('SELECT first_name, last_name FROM employees WHERE id = $1', [employeeUuid]),
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

    await sendNewWfhRequestToManagers({
      managerEmails,
      tenantName,
      employeeName,
      requestDate: ymd,
      isHalfDay: !!isHalfDay,
      reason: reason ?? null,
    });

    return NextResponse.json({ success: true, request: row });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === '42P01') {
      return NextResponse.json(
        { error: 'WFH is not set up yet. Run migrations/add_wfh_requests.sql on the database.' },
        { status: 503 }
      );
    }
    console.error('wfh POST', e);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
