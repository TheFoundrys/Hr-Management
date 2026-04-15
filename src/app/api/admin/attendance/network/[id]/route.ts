import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

/**
 * Update or Delete a Network Policy
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;
    const { tenantId } = payload;
    const { ip_address_or_range, label, is_active } = await request.json();

    const result = await query(
      `UPDATE attendance_network_policies 
       SET ip_address_or_range = COALESCE($1, ip_address_or_range),
           label = COALESCE($2, label),
           is_active = COALESCE($3, is_active),
           updated_at = NOW()
       WHERE id = $4 AND tenant_id = $5
       RETURNING *`,
      [ip_address_or_range, label, is_active, id, tenantId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !['ADMIN', 'SUPER_ADMIN'].includes(payload.role || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;
    const { tenantId } = payload;

    const result = await query(
      'DELETE FROM attendance_network_policies WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Policy deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
