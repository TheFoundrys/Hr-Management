import { NextResponse } from 'next/server';
import { ZKService } from '@/lib/biometric/zk-service';

/**
 * MANUAL SYNC API: THE "BORINGLY SIMPLE" VERSION
 * Authentication and configuration only. All logic is at the Service Level.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    
    const deviceIp = body.ip || searchParams.get('ip') || process.env.ZKTECO_DEVICE_IP;
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const deviceId = body.deviceId || 'MANUAL-SYNC';

    if (!deviceIp) {
      return NextResponse.json({ error: 'Device IP not configured' }, { status: 400 });
    }

    // High-level orchestration (Connect, Fetch, Insert, Process)
    const result = await new ZKService(deviceIp).sync(tenantId, deviceId);

    return NextResponse.json({
      success: true,
      message: `Sync successful. Processed ${result.processing.records} attendance records.`,
      ...result
    });

  } catch (error) {
    console.error('[API] Biometric sync failure:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Manual sync failed' }, { status: 500 });
  }
}
