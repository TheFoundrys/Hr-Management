import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';
import { processAttendance } from '@/lib/attendance/engine';

/**
 * MANUAL TRIGGER: Process attendance for a tenant
 * Requirements: Auth-token cookie must be present and valid
 */
export async function POST(request: Request) {
  try {
    // 1. Authentication Check
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload?.tenantId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const tenantId = payload.tenantId;
    const today = new Date().toISOString().split('T')[0];

    // 2. Direct Engine Call (No internal API fetch)
    const result = await processAttendance(tenantId, today);

    // 3. Clean Simplified Response
    return NextResponse.json({
      success: true,
      processed: result.processed,
      records: result.records,
      message: `Successfully processed ${result.records} attendance records.`
    });

  } catch (error) {
    console.error('[API] Attendance processing failure:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Re-export for internal usage (workers, cron, etc)
 * Allows systems to bypass HTTP/Auth requirements
 */
export { processAttendance };
