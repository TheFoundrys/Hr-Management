import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/auth/rbac';
import { sendWfhDecisionToEmployee } from '@/lib/mail/leaveNotifications';

async function getTenantName(tenantId: string): Promise<string> {
  const r = await query('SELECT name FROM tenants WHERE id = $1', [tenantId]);
  return r.rows[0]?.name || 'HR Portal';
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    if (!hasPermission(payload.role || '', 'MANAGE_LEAVE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, status, remarks } = body;
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const r = await query(
      `SELECT w.*, e.first_name, e.last_name,
              COALESCE(NULLIF(TRIM(u.email), ''), NULLIF(TRIM(e.email), '')) AS to_email
       FROM wfh_requests w
       JOIN employees e ON e.id = w.employee_id
       LEFT JOIN users u ON u.id = e.user_id
       WHERE w.id = $1::uuid AND w.tenant_id = $2`,
      [requestId, tenantId]
    );
    if (!r.rowCount) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const row = r.rows[0];

    await query(`UPDATE wfh_requests SET status = $1, updated_at = NOW() WHERE id = $2::uuid AND tenant_id = $3`, [
      status,
      requestId,
      tenantId,
    ]);

    const tenantName = await getTenantName(tenantId);
    const employeeName = `${row.first_name} ${row.last_name}`.trim();
    if (row.to_email) {
      await sendWfhDecisionToEmployee({
        toEmail: row.to_email,
        employeeName,
        tenantName,
        decision: status as 'approved' | 'rejected',
        requestDate: String(row.request_date).slice(0, 10),
        isHalfDay: !!row.is_half_day,
        remarks: remarks ?? null,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === '42P01') {
      return NextResponse.json(
        { error: 'WFH is not set up yet. Run migrations/add_wfh_requests.sql on the database.' },
        { status: 503 }
      );
    }
    console.error('wfh approve', e);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
