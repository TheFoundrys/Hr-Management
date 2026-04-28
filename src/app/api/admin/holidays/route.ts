import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';
import { hasPermission } from '@/lib/auth/rbac';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const result = await query(
      'SELECT * FROM holidays WHERE tenant_id = $1 ORDER BY date ASC',
      [tenantId]
    );
    return NextResponse.json({ success: true, holidays: result.rows });
  } catch (error) {
    console.error('Holidays GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const userRole = request.headers.get('x-user-role') || '';
    
    if (!hasPermission(userRole, 'MANAGE_SYSTEM')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { name, date, type } = await request.json();

    if (!name || !date) {
      return NextResponse.json({ error: 'Name and date are required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO holidays (id, tenant_id, name, date, type) 
       VALUES (gen_random_uuid(), $1, $2, $3, $4) 
       RETURNING *`,
      [tenantId, name, date, type || 'public']
    );

    return NextResponse.json({ success: true, holiday: result.rows[0] });
  } catch (error) {
    console.error('Holidays POST error:', error);
    return NextResponse.json({ error: 'Failed to create holiday' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const userRole = request.headers.get('x-user-role') || '';
    
    if (!hasPermission(userRole, 'MANAGE_SYSTEM')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await query(
      'DELETE FROM holidays WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    return NextResponse.json({ success: true, message: 'Holiday deleted' });
  } catch (error) {
    console.error('Holidays DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 });
  }
}
