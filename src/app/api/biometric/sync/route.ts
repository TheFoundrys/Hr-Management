import { NextResponse } from 'next/server';
import { ZKService } from '@/lib/biometric/zk-service';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    
    const requestedIp = body.ip || searchParams.get('ip');
    const deviceIp = requestedIp || process.env.ZKTECO_DEVICE_IP;
    const tenantId = request.headers.get('x-tenant-id') || 'default';

    if (!deviceIp) {
      return NextResponse.json({ error: 'ZKTECO_DEVICE_IP not configured' }, { status: 400 });
    }

    const zkService = new ZKService(deviceIp);
    const result = await zkService.syncLogs(tenantId);

    // After syncing raw logs, trigger attendance processing
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    try {
      await fetch(`${baseUrl}/api/attendance/process`, {
        method: 'POST',
        headers: {
          'x-tenant-id': tenantId,
        },
      });
    } catch (e) {
      console.warn('⚠️ Sync succeeded but auto-processing attendance failed. User should run it manually.', e);
    }

    return NextResponse.json({
      message: `Sync successful. New logs: ${result.count}, Total retrieved: ${result.total}`,
      ...result,
    });
  } catch (error) {
    console.error('Manual biometric sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
