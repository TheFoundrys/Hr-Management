import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
       return NextResponse.redirect(new URL('/login?error=Invalid token', request.url));
    }

    // Find and validate token
    const result = await query(
      'SELECT id, email, verification_token_expires FROM users WHERE verification_token = $1 LIMIT 1',
      [token]
    );

    if (result.rowCount === 0) {
      return NextResponse.redirect(new URL('/login?error=Invalid or used token', request.url));
    }

    const user = result.rows[0];

    // Check expiry
    if (new Date() > new Date(user.verification_token_expires)) {
      return NextResponse.redirect(new URL('/login?error=Verification link expired. Please login again to resend.', request.url));
    }

    // Verify User
    await query(
      'UPDATE users SET is_verified = true, verification_token = NULL, verification_token_expires = NULL WHERE id = $1',
      [user.id]
    );

    // Redirect to login with success
    return NextResponse.redirect(new URL('/login?success=Email verified successfully. You can now login.', request.url));

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.redirect(new URL('/login?error=An internal error occurred', request.url));
  }
}
