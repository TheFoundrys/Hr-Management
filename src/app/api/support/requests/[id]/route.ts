import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !['ADMIN', 'HR', 'SUPER_ADMIN'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, admin_comments } = body;

    const result = await query(
      `UPDATE support_requests 
       SET status = COALESCE($1, status),
           admin_comments = COALESCE($2, admin_comments),
           updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4
       RETURNING *`,
      [status, admin_comments, id, payload.tenantId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: result.rows[0] });
  } catch (error) {
    console.error('Update support request error:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
