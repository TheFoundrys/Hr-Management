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
    if (!payload || !['admin', 'HR'].includes(payload.role.toLowerCase())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { start_time, end_time, day_of_week } = await req.json();

    const { rows } = await query(`
      INSERT INTO time_slots (start_time, end_time, day_of_week, tenant_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [start_time, end_time, day_of_week, payload.tenantId]);

    return NextResponse.json({ success: true, slot: rows[0] });
  } catch (err) {
    console.error('POST slot error:', err);
    return NextResponse.json({ error: 'Failed to create slot' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { rows } = await query('SELECT * FROM time_slots WHERE tenant_id = $1 ORDER BY start_time', [payload.tenantId]);
    return NextResponse.json({ success: true, slots: rows });
  } catch (err) { return NextResponse.json({ error: 'Internal Error' }, { status: 500 }); }
}
