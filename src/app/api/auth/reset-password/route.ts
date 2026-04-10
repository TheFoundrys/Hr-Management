import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { hashPassword } from '@/lib/auth/password';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password required' }, { status: 400 });
    }

    // Find user with valid token
    const result = await query(
      'SELECT id, reset_token_expires FROM users WHERE reset_token = $1 LIMIT 1',
      [token]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const user = result.rows[0];

    // Check expiry
    if (new Date() > new Date(user.reset_token_expires)) {
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password and clear token
    await query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    return NextResponse.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
