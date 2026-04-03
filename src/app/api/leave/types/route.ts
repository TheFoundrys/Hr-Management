import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);

    const result = await query(
      'SELECT * FROM leave_types WHERE tenant_id = $1 ORDER BY name ASC',
      [tenantId]
    );

    return NextResponse.json({ success: true, types: result.rows });
  } catch (error) {
    console.error('Fetch leave types error:', error);
    return NextResponse.json({ error: 'Failed to fetch leave types' }, { status: 500 });
  }
}
