import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';
import { verifyToken } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const result = await query(`
      SELECT p.*, 
             f.first_name || ' ' || f.last_name as from_name,
             t.first_name || ' ' || t.last_name as to_name
      FROM praises p
      JOIN employees f ON p.from_employee_id = f.id
      JOIN employees t ON p.to_employee_id = t.id
      WHERE p.tenant_id = $1
      ORDER BY p.created_at DESC
      LIMIT 20
    `, [tenantId]);
    
    return NextResponse.json({ success: true, praises: result.rows });
  } catch (error) {
    console.error('Praises GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch praises' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get current employee internal UUID
    const userRes = await query(`
      SELECT e.id 
      FROM users u
      JOIN employees e ON u.employee_id = e.employee_id
      WHERE u.id = $1 AND e.tenant_id = $2
    `, [payload.userId, tenantId]);
    const fromEmployeeId = userRes.rows[0]?.id;

    if (!fromEmployeeId) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    const { toEmployeeId, title, message } = await request.json();

    if (!toEmployeeId || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await query(`
      INSERT INTO praises (tenant_id, from_employee_id, to_employee_id, title, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [tenantId, fromEmployeeId, toEmployeeId, title, message]);

    return NextResponse.json({ success: true, praise: result.rows[0] });
  } catch (error) {
    console.error('Praises POST error:', error);
    return NextResponse.json({ error: 'Failed to create praise' }, { status: 500 });
  }
}
