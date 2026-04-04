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

    let q = 'SELECT * FROM courses WHERE tenant_id = $1';
    const params: any[] = [payload.tenantId];

    if (payload.role.toUpperCase() === 'HOD' && payload.departmentId) {
      q += ' AND department_id = $2';
      params.push(payload.departmentId);
    }
    
    q += ' ORDER BY name';

    const { rows } = await query(q, params);
    return NextResponse.json({ success: true, courses: rows });
  } catch (err) {
    console.error('GET courses error:', err);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !['admin', 'HR', 'HOD'].includes(payload.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, year, semester } = body;
    const department_id = payload.role.toUpperCase() === 'HOD' ? payload.departmentId : (body.department_id || body.departmentId);

    const { rows } = await query(`
      INSERT INTO courses (name, department_id, year, semester, tenant_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, department_id, year, semester, payload.tenantId]);

    return NextResponse.json({ success: true, course: rows[0] });
  } catch (err) {
    console.error('POST course error:', err);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
