import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

// ZKTeco ADMS push endpoint
export async function POST(request: Request) {
  try {
    // IP whitelisting
    const allowedIPs = (process.env.ALLOWED_DEVICE_IPS || '').split(',').map((ip) => ip.trim());
    const clientIP =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    if (allowedIPs.length > 0 && allowedIPs[0] !== '' && !allowedIPs.includes(clientIP)) {
      console.warn(`⚠️ Biometric push rejected from IP: ${clientIP}`);
      return NextResponse.json({ error: 'Forbidden: IP not allowed' }, { status: 403 });
    }

    // Secret key validation
    const secretKey = request.headers.get('x-biometric-key');
    const expectedKey = process.env.BIOMETRIC_SECRET_KEY;
    if (expectedKey && secretKey !== expectedKey) {
      return NextResponse.json({ error: 'Forbidden: Invalid secret key' }, { status: 403 });
    }

    // Parse raw text body
    const rawBody = await request.text();
    const logs = rawBody
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => parseBiometricLine(line.trim()));

    if (logs.length === 0) {
      return NextResponse.json({ error: 'No valid biometric data' }, { status: 400 });
    }

    // Default tenant (can be overridden by header)
    const tenantId = request.headers.get('x-tenant-id') || 'default';

    const savedCount = [];
    for (const log of logs) {
      if (!log) continue;

      await query(
        `INSERT INTO biometric_logs (device_user_id, timestamp, raw_data, device_id, tenant_id, status, processed)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [log.userId, log.checkTime, log.rawLine, log.deviceId || 'ADMS', tenantId, log.status, false]
      );
      savedCount.push(log);
    }

    console.log(`📟 Received ${savedCount.length} biometric logs from ${clientIP}`);

    return NextResponse.json({
      success: true,
      message: `Received ${savedCount.length} log(s)`,
      count: savedCount.length,
    });
  } catch (error) {
    console.error('Biometric push error:', error);
    return NextResponse.json({ error: 'Failed to process biometric data' }, { status: 500 });
  }
}

function parseBiometricLine(
  line: string
): { userId: string; checkTime: Date; status: number; deviceId: string; rawLine: string } | null {
  try {
    const parts = line.split('\t');
    const data: Record<string, string> = {};

    for (const part of parts) {
      const [key, ...valueParts] = part.split('=');
      data[key.trim()] = valueParts.join('=').trim();
    }

    if (!data['USERID'] || !data['CHECKTIME']) {
      return null;
    }

    return {
      userId: data['USERID'],
      checkTime: new Date(data['CHECKTIME']),
      status: parseInt(data['STATUS'] || '0'),
      deviceId: data['DEVICEID'] || 'ADMS',
      rawLine: line,
    };
  } catch {
    console.error('Failed to parse biometric line:', line);
    return null;
  }
}
