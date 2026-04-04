import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !['admin', 'HR', 'HOD'].includes(payload.role.toLowerCase())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { room_number, capacity } = await req.json();

    const { rows } = await query(`
      INSERT INTO classrooms (room_number, capacity, tenant_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [room_number, capacity, payload.tenantId]);

    return NextResponse.json({ success: true, room: rows[0] });
  } catch (err) {
    console.error('POST room error:', err);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { rows } = await query('SELECT * FROM classrooms WHERE tenant_id = $1 ORDER BY room_number', [payload.tenantId]);
    return NextResponse.json({ success: true, rooms: rows });
  } catch (err) { return NextResponse.json({ error: 'Internal Error' }, { status: 500 }); }
}
