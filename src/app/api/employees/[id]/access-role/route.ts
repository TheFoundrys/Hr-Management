import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { verifyToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db/postgres';
import { type Permission } from '@/lib/auth/rbac';
import { canAssignRole, canManageEmployeeLoginAccess } from '@/lib/auth/accessControl';
import { hashPassword } from '@/lib/auth/password';
import { sendOnboardingInvite } from '@/lib/mail/mailer';
import { logAudit } from '@/lib/utils/audit';

async function loadCustomRoles(tenantId: string): Promise<Record<string, Permission[]> | undefined> {
  try {
    const ts = await query(`SELECT settings FROM tenants WHERE id = $1`, [tenantId]);
    const raw = ts.rows[0]?.settings;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed?.roles && typeof parsed.roles === 'object') {
      return parsed.roles as Record<string, Permission[]>;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const actorRole = (payload.role || '').toUpperCase().replace(/-/g, '_');
    const tenantId = payload.tenantId;
    const customRoles = await loadCustomRoles(tenantId);

    if (!canManageEmployeeLoginAccess(actorRole, customRoles)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const newRole = String(body.role || '').trim();
    if (!newRole) {
      return NextResponse.json({ error: 'Missing role' }, { status: 400 });
    }
    if (!canAssignRole(actorRole, newRole, customRoles)) {
      return NextResponse.json({ error: 'You are not allowed to assign this role' }, { status: 403 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const empRes = await query(
      `SELECT e.id, e.user_id, e.email, e.first_name, e.last_name, e.tenant_id, e.university_id, e.employee_id
       FROM employees e
       WHERE (${isUuid ? 'e.id = $1' : '(e.university_id = $1 OR e.employee_id = $1)'}) AND e.tenant_id = $2
       LIMIT 1`,
      [id, tenantId]
    );
    if (!empRes.rowCount) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    const emp = empRes.rows[0] as {
      id: string;
      user_id: string | null;
      email: string;
      first_name: string;
      last_name: string;
      tenant_id: string;
      university_id: string;
      employee_id: string | null;
    };

    const emailNorm = String(emp.email || '').trim().toLowerCase();
    if (!emailNorm) {
      return NextResponse.json({ error: 'Employee has no email; cannot create login' }, { status: 400 });
    }

    let userId: string | null = emp.user_id;
    let userRow: { id: string; role: string } | null = null;

    if (userId) {
      const u = await query(`SELECT id, role FROM users WHERE id = $1 AND tenant_id = $2`, [userId, tenantId]);
      userRow = u.rows[0] || null;
    }
    if (!userRow) {
      const u2 = await query(
        `SELECT id, role FROM users WHERE tenant_id = $1 AND LOWER(TRIM(email)) = $2 LIMIT 1`,
        [tenantId, emailNorm]
      );
      userRow = u2.rows[0] || null;
      if (userRow) userId = userRow.id;
    }

    if (userRow && userRow.id === payload.userId) {
      return NextResponse.json({ error: 'Cannot change your own access role from here' }, { status: 400 });
    }

    if (userRow) {
      const other = await query(
        `SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2 AND id <> $3 LIMIT 1`,
        [userRow.id, tenantId, emp.id]
      );
      if (other.rowCount) {
        return NextResponse.json(
          { error: 'This login is already linked to another employee in your organization' },
          { status: 409 }
        );
      }

      const oldRole = userRow.role;
      await query(`UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`, [
        newRole,
        userRow.id,
        tenantId,
      ]);
      if (!emp.user_id) {
        await query(`UPDATE employees SET user_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`, [
          userRow.id,
          emp.id,
          tenantId,
        ]);
      }

      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
      await logAudit({
        tenantId,
        userId: payload.userId,
        action: 'USER_ROLE_CHANGE',
        entityType: 'user',
        entityId: userRow.id,
        oldValue: { role: oldRole, employeeId: emp.id },
        newValue: { role: newRole, employeeId: emp.id },
        ipAddress: ip,
      });

      return NextResponse.json({ success: true, userId: userRow.id, role: newRole, linked: !emp.user_id });
    }

    const tempPassword = crypto.randomBytes(6).toString('hex');
    const passwordHash = await hashPassword(tempPassword);
    const verificationToken = crypto.randomUUID();
    const verificationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const displayName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emailNorm;
    const empCode = emp.employee_id || emp.university_id || '';

    const ins = await query(
      `INSERT INTO users (
        name, email, password_hash, role, tenant_id, employee_id,
        is_active, is_verified, verification_token, verification_token_expires
      ) VALUES ($1, $2, $3, $4, $5, $6, true, false, $7, $8)
      RETURNING id`,
      [
        displayName,
        emailNorm,
        passwordHash,
        newRole,
        tenantId,
        empCode || null,
        verificationToken,
        verificationExpires,
      ]
    );
    const newUserId = ins.rows[0].id as string;

    await query(`UPDATE employees SET user_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`, [
      newUserId,
      emp.id,
      tenantId,
    ]);

    try {
      const tenantRes = await query('SELECT name FROM tenants WHERE id = $1', [tenantId]);
      const tenantName = tenantRes.rows[0]?.name || 'HR Portal';
      await sendOnboardingInvite(emailNorm, displayName, tempPassword, verificationToken, tenantName);
    } catch (mailError) {
      console.warn('Onboarding email delivery failed:', mailError);
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    await logAudit({
      tenantId,
      userId: payload.userId,
      action: 'USER_ROLE_CHANGE',
      entityType: 'user',
      entityId: newUserId,
      oldValue: { created: true, employeeId: emp.id },
      newValue: { role: newRole, employeeId: emp.id },
      ipAddress: ip,
    });

    return NextResponse.json({ success: true, userId: newUserId, role: newRole, created: true });
  } catch (e: unknown) {
    console.error('access-role PATCH', e);
    const err = e as { code?: string };
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Email or login already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
