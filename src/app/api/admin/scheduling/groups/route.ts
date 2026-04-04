import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    let q = `
      SELECT g.*, c.name as course_name 
      FROM subject_groups g
      LEFT JOIN courses c ON g.course_id = c.id
      WHERE g.tenant_id = $1
    `;
    const params: any[] = [payload.tenantId];

    if (payload.role.toUpperCase() === 'HOD' && payload.departmentId) {
      q += ` AND c.department_id = $2`;
      params.push(payload.departmentId);
    }

    q += ` ORDER BY g.created_at DESC`;
    const result = await query(q, params);

    return NextResponse.json({ success: true, groups: result.rows });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !['admin', 'HR', 'HOD'].includes(payload.role.toLowerCase())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, course_id, semester } = body;

    const result = await query(`
      INSERT INTO subject_groups (name, course_id, semester, tenant_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, course_id, semester, payload.tenantId]);

    return NextResponse.json({ success: true, group: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
