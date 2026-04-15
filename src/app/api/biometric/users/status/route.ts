import { NextResponse } from 'next/server';
import { ZKService } from '@/lib/biometric/zk-service';



export async function POST(request: Request) {
  const { deviceUserId, enabled, ip } = await request.json();
  const deviceIp = ip;

  if (!deviceIp) return NextResponse.json({ error: 'Device IP required' }, { status: 400 });
  
  const zk = new ZKService(deviceIp);
  const result = await zk.setUserStatus(deviceUserId, enabled);
  
  return NextResponse.json(result);
}
