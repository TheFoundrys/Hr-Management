import { NextResponse } from 'next/server';
import { ZKService } from '@/lib/biometric/zk-service';

const deviceIp = process.env.ZKTECO_DEVICE_IP;

export async function POST(request: Request) {
  const { deviceUserId, enabled, ip } = await request.json();
  const deviceIp = ip || process.env.ZKTECO_DEVICE_IP;

  if (!deviceIp) return NextResponse.json({ error: 'Not configured' }, { status: 400 });
  
  const zk = new ZKService(deviceIp);
  const result = await zk.setUserStatus(deviceUserId, enabled);
  
  return NextResponse.json(result);
}
