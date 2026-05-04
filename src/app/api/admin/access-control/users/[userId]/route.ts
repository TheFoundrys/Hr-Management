import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db/postgres';
import { hasPermission, type Permission } from '@/lib/auth/rbac';
import { logAudit } from '@/lib/utils/audit';
import { canAssignRole, canManageEmployeeLoginAccess } from '@/lib/auth/accessControl';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: targetUserId } = await context.params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const actorRole = (payload.role || '').toUpperCase().replace(/-/g, '_');
    const tenantId = payload.tenantId;
    let customRoles: Record<string, Permission[]> | undefined;
    try {
      const ts = await query(`SELECT settings FROM tenants WHERE id = $1`, [tenantId]);
      const raw = ts.rows[0]?.settings;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed?.roles && typeof parsed.roles === 'object') {
        customRoles = parsed.roles as Record<string, Permission[]>;
      }
    } catch {
      /* ignore */
    }

    if (!canManageEmployeeLoginAccess(actorRole, customRoles)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!targetUserId || targetUserId === payload.userId) {
      return NextResponse.json({ error: 'Cannot change your own access role from this endpoint' }, { status: 400 });
    }

    const body = await request.json();
    const newRole = String(body.role || '').trim();
    if (!newRole) {
      return NextResponse.json({ error: 'Missing role' }, { status: 400 });
    }

    if (!canAssignRole(actorRole, newRole, customRoles)) {
      return NextResponse.json({ error: 'You are not allowed to assign this role' }, { status: 403 });
    }
    const targetRes = await query(
      `SELECT id, role, tenant_id FROM users WHERE id = $1 AND tenant_id = $2`,
      [targetUserId, tenantId]
    );
    if (!targetRes.rowCount) {
      return NextResponse.json({ error: 'User not found in this tenant' }, { status: 404 });
    }

    const oldRole = targetRes.rows[0].role;
    if (String(oldRole).toUpperCase() === 'SUPER_ADMIN' && actorRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await query(`UPDATE users SET role = $1 WHERE id = $2 AND tenant_id = $3`, [newRole, targetUserId, tenantId]);

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';

    await logAudit({
      tenantId,
      userId: payload.userId,
      action: 'USER_ROLE_CHANGE',
      entityType: 'user',
      entityId: targetUserId,
      oldValue: { role: oldRole },
      newValue: { role: newRole },
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, userId: targetUserId, role: newRole });
  } catch (e) {
    console.error('access-control PATCH', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
