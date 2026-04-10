import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import crypto from 'crypto';
import { sendResetPasswordEmail } from '@/lib/mail/mailer';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const result = await query(
      'SELECT id, name, email FROM users WHERE email = $1 LIMIT 1',
      [email.toLowerCase()]
    );

    if (result.rowCount === 0) {
      // Don't reveal if user exists for security, but we'll return 200
      return NextResponse.json({ success: true, message: 'If this email exists, a reset link has been sent.' });
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expires, user.id]
    );

    /*
    await sendResetPasswordEmail(user.email, user.name, token);
    */

    return NextResponse.json({ success: true, message: 'Reset link sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
