import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import crypto from 'crypto';

const getBaseUrl = () =>
  (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://hrms.thefoundrys.com').replace(/\/$/, '');

export async function GET(request: Request) {
  const base = getBaseUrl();
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(`${base}/login?error=Invalid+token`);
    }

    // Find and validate token
    const result = await query(
      'SELECT id, email, verification_token_expires FROM users WHERE verification_token = $1 LIMIT 1',
      [token]
    );

    if ((result.rowCount || 0) === 0) {
      return NextResponse.redirect(`${base}/login?error=Invalid+or+used+token`);
    }

    const user = result.rows[0];

    // Check expiry
    if (new Date() > new Date(user.verification_token_expires)) {
      return NextResponse.redirect(`${base}/login?error=Verification+link+expired`);
    }

    // 1. Verify User and Generate a Reset Token for immediate password setup
    const resetToken = crypto.randomUUID();
    const resetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await query(
      `UPDATE users SET 
        is_verified = true, 
        verification_token = NULL, 
        verification_token_expires = NULL,
        reset_token = $2,
        reset_token_expires = $3
      WHERE id = $1`,
      [user.id, resetToken, resetExpires]
    );

    // 2. Always redirect to production domain — never use request.url as base
    return NextResponse.redirect(`${base}/reset-password?token=${resetToken}&onboarding=true`);

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.redirect(`${base}/login?error=An+internal+error+occurred`);
  }
}
