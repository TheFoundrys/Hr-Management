import { NextResponse } from 'next/server';
import { ZKService } from '@/lib/biometric/zk-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedIp = searchParams.get('ip');
  const deviceIp = requestedIp;

  if (!deviceIp) return NextResponse.json({ error: 'Device IP required' }, { status: 400 });
  const zk = new ZKService(deviceIp);
  const result = await zk.testConnection();
  return NextResponse.json(result);
}
