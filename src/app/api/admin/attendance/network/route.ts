import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

/**
 * Get all Network Policies for current tenant
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { tenantId } = payload;
    const result = await query(
      'SELECT id, ip_address_or_range, label, is_active FROM attendance_network_policies WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Add a new Network Policy
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { tenantId } = payload;
    const { ip_address_or_range, label, is_active } = await request.json();

    if (!ip_address_or_range) {
      return NextResponse.json({ error: 'IP address or range is required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO attendance_network_policies (tenant_id, ip_address_or_range, label, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tenantId, ip_address_or_range, label, is_active ?? true]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
