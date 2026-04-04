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
    
    let q = `
      SELECT s.*, g.name as group_name, c.name as course_name
      FROM subjects s
      LEFT JOIN subject_groups g ON s.group_id = g.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE s.tenant_id = $1
    `;
    const params: any[] = [payload.tenantId];

    if (payload.role.toUpperCase() === 'HOD' && payload.departmentId) {
      q += ` AND c.department_id = $2`;
      params.push(payload.departmentId);
    }

    q += ` ORDER BY s.name`;
    const { rows } = await query(q, params);
    
    return NextResponse.json({ success: true, subjects: rows });
  } catch (err) { return NextResponse.json({ error: 'Internal Error' }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    const allowed = ['admin', 'HR', 'HOD'];
    if (!payload || !allowed.includes(payload.role.toLowerCase())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, course_id, group_id, hours_per_week } = body;

    const { rows } = await query(`
      INSERT INTO subjects (name, course_id, group_id, hours_per_week, tenant_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, course_id, group_id, hours_per_week, payload.tenantId]);

    return NextResponse.json({ success: true, subject: rows[0] });
  } catch (err) {
    console.error('POST subject error:', err);
    return NextResponse.json({ error: 'Failed to create subject' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || !['admin', 'HR'].includes(payload.role.toLowerCase())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    await query('DELETE FROM subjects WHERE id = $1 AND tenant_id = $2', [id, payload.tenantId]);
    return NextResponse.json({ success: true });
  } catch (err) { return NextResponse.json({ error: 'Internal Error' }, { status: 500 }); }
}
