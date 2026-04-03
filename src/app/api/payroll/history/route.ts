import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get employee_id (TFU-XXXXX) from users table
    const userResult = await query('SELECT employee_id FROM users WHERE id = $1', [userId]);
    const empIdStr = userResult.rows[0]?.employee_id;

    if (!empIdStr) {
      return NextResponse.json({ success: true, payslips: [] });
    }

    // 2. Get payslip records for this employee
    const result = await query(
      `SELECT * FROM payslip_records 
       WHERE user_id = $1 AND tenant_id = $2 
       ORDER BY year DESC, month DESC`,
      [empIdStr, tenantId]
    );

    return NextResponse.json({ success: true, payslips: result.rows });
  } catch (error) {
    console.error('Get payslip history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
