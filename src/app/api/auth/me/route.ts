import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Fetch tenant details
    let tenantName = 'Management Compass';
    let tenantType = 'EDUCATION';
    if (payload.tenantId) {
      const res = await query('SELECT name, tenant_type FROM tenants WHERE id = $1', [payload.tenantId]);
      if (res.rows.length > 0) {
        tenantName = res.rows[0].name;
        tenantType = res.rows[0].tenant_type;
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenantId,
        tenantName: tenantName,
        tenantType: tenantType,
        employeeId: payload.employeeId,
      },
    });
  } catch (error) {
    console.error('Auth/me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
