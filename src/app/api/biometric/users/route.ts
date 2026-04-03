import { NextResponse } from 'next/server';
import { ZKService } from '@/lib/biometric/zk-service';

const deviceIp = process.env.ZKTECO_DEVICE_IP;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedIp = searchParams.get('ip');
  const deviceIp = requestedIp || process.env.ZKTECO_DEVICE_IP;

  if (!deviceIp) return NextResponse.json({ error: 'Not configured' }, { status: 400 });
  const zk = new ZKService(deviceIp);
  const result = await zk.getUsers();
  return NextResponse.json(result);
}
