import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { rows } = await query('SELECT * FROM departments WHERE tenant_id = $1 ORDER BY name', [payload.tenantId]);
    return NextResponse.json({ success: true, departments: rows });
  } catch (err) { return NextResponse.json({ error: 'Internal Error' }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !['admin', 'HR'].includes(payload.role.toLowerCase())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name } = await req.json();

    const { rows } = await query(`
      INSERT INTO departments (name, tenant_id)
      VALUES ($1, $2)
      RETURNING *
    `, [name, payload.tenantId]);

    return NextResponse.json({ success: true, department: rows[0] });
  } catch (err) { 
    console.error('POST department error:', err);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 }); 
  }
}
