import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { hasPermission } from '@/lib/auth/rbac';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    if (!hasPermission(payload.role, 'MANAGE_EMPLOYEES')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await query(`
      SELECT id, name, email, role, created_at, tenant_id
      FROM users 
      WHERE role = 'PENDING' AND tenant_id = $1
      ORDER BY created_at DESC
    `, [payload.tenantId]);

    return NextResponse.json({
      success: true,
      pendingUsers: result.rows
    });
  } catch (error) {
    console.error('Fetch pending users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
