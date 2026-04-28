import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';
import { verifyToken } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userRes = await query('SELECT e.id FROM users u JOIN employees e ON u.employee_id = e.employee_id WHERE u.id = $1 AND e.tenant_id = $2', [payload.userId, tenantId]);
    const employeeId = userRes.rows[0]?.id;
    if (!employeeId) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const { praiseId } = await request.json();
    if (!praiseId) return NextResponse.json({ error: 'Missing praiseId' }, { status: 400 });

    // Verify praise exists in tenant
    const praiseCheck = await query('SELECT id FROM praises WHERE id = $1 AND tenant_id = $2', [praiseId, tenantId]);
    if (!praiseCheck.rows.length) return NextResponse.json({ error: 'Praise not found' }, { status: 404 });

    // Check if already liked
    const likeCheck = await query('SELECT id FROM praise_likes WHERE praise_id = $1 AND employee_id = $2', [praiseId, employeeId]);
    
    if (likeCheck.rows.length > 0) {
      // Unlike
      await query('DELETE FROM praise_likes WHERE praise_id = $1 AND employee_id = $2', [praiseId, employeeId]);
      return NextResponse.json({ success: true, liked: false });
    } else {
      // Like
      await query('INSERT INTO praise_likes (praise_id, employee_id) VALUES ($1, $2)', [praiseId, employeeId]);
      return NextResponse.json({ success: true, liked: true });
    }
  } catch (error) {
    console.error('Praise Like POST error:', error);
    return NextResponse.json({ error: 'Failed to process like' }, { status: 500 });
  }
}
