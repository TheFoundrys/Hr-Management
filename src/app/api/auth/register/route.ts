import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { hashPassword } from '@/lib/auth/password';
import { registerSchema } from '@/lib/utils/validation';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, tenantId } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Resolve tenant UUID — the frontend sends 'default' but the DB column is UUID
    let resolvedTenantId = tenantId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId);
    if (!isUuid) {
      const tenantResult = await query('SELECT id FROM tenants LIMIT 1');
      if (tenantResult.rows.length > 0) {
        resolvedTenantId = tenantResult.rows[0].id;
      } else {
        return NextResponse.json({ error: 'No tenant configured. Contact administrator.' }, { status: 400 });
      }
    }

    // Check existing user
    const checkUser = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (checkUser.rowCount && checkUser.rowCount > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // Initial status: PENDING and UNVERIFIED
    const forcedRole = 'PENDING';
    const verificationToken = crypto.randomUUID();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, tenant_id, is_active, is_verified, verification_token, verification_token_expires)
       VALUES ($1, $2, $3, $4, $5, false, false, $6, $7)
       RETURNING id, name, email, role, tenant_id`,
      [name, normalizedEmail, passwordHash, forcedRole, resolvedTenantId, verificationToken, verificationExpires]
    );

    /*
    // Send verification email
    try {
      const { sendVerificationEmail } = await import('@/lib/mail/mailer');
      await sendVerificationEmail(normalizedEmail, name, verificationToken);
    } catch (mailError) {
      console.warn('Mail delivery delayed or failed:', mailError);
    }
    */

    const user = result.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please wait for an Administrator to approve your account and assign your official role.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

