import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { verifyPassword } from '@/lib/auth/password';
import { createToken } from '@/lib/auth/jwt';
import { loginSchema } from '@/lib/utils/validation';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // 1. Rate Limiting Check
    const rateRes = await query('SELECT attempts, lockout_until FROM rate_limits WHERE ip = $1', [ip]);
    if (rateRes.rowCount && rateRes.rowCount > 0) {
      const limit = rateRes.rows[0];
      if (limit.lockout_until && new Date() < new Date(limit.lockout_until)) {
        return NextResponse.json({ error: 'Too many failed attempts. Try again later.' }, { status: 429 });
      }
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Find user in PostgreSQL
    const result = await query(`
      SELECT u.id, u.name, u.email, u.password_hash, u.role, u.tenant_id, u.employee_id, u.is_active, e.department_id
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.employee_id
      WHERE u.email = $1
    `, [normalizedEmail]);

    const user = result.rows[0];

    // Failure Handler Function
    const handleFailure = async () => {
      await query(`
        INSERT INTO rate_limits (ip, attempts, lockout_until) 
        VALUES ($1, 1, NULL) 
        ON CONFLICT (ip) DO UPDATE SET 
        attempts = rate_limits.attempts + 1,
        lockout_until = CASE WHEN rate_limits.attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END
      `, [ip]);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    };

    if (!user) return handleFailure();

    // Verify Password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) return handleFailure();

    // 2. Email Verification Check (Bypassed by User Request)
    /*
    if (!user.is_verified) {
      // ... previous logic
    }
    */

    // Clear Rate Limit on Success
    await query('DELETE FROM rate_limits WHERE ip = $1', [ip]);

    // Check Approval Status
    if (!user.is_active || user.role === 'PENDING') {
      return NextResponse.json({ error: 'Account pending admin approval. Please wait.' }, { status: 403 });
    }

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      name: user.name,
      employeeId: user.employee_id,
      departmentId: user.department_id,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, tenantId: user.tenant_id,
        employeeId: user.employee_id, departmentId: user.department_id,
      },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 60 * 60, path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
