import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const result = await query(
      'SELECT id, first_name, last_name FROM employees WHERE tenant_id = $1 AND is_active = true ORDER BY first_name ASC',
      [tenantId]
    );
    return NextResponse.json({ success: true, employees: result.rows });
  } catch (error) {
    console.error('Employees simple GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}
