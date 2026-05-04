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

    const userRes = await query(
      'SELECT id, name, email, role, tenant_id, employee_id, is_active FROM users WHERE id = $1',
      [payload.userId]
    );
    const currentUser = userRes.rows[0];
    if (!currentUser || !currentUser.is_active) {
      return NextResponse.json({ error: 'User not active' }, { status: 401 });
    }

    // Fetch tenant details
    let tenantName = 'Management Compass';
    let tenantType = 'EDUCATION';
    let tenantSettings = {};
    if (currentUser.tenant_id) {
      const res = await query('SELECT name, tenant_type, settings FROM tenants WHERE id = $1', [currentUser.tenant_id]);
      if (res.rows.length > 0) {
        tenantName = res.rows[0].name;
        tenantType = res.rows[0].tenant_type;
        tenantSettings = res.rows[0].settings || {};
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        tenantId: currentUser.tenant_id,
        tenantName: tenantName,
        tenantType: tenantType,
        tenantSettings: tenantSettings,
        employeeId: currentUser.employee_id,
      },
    });
  } catch (error) {
    console.error('Auth/me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
