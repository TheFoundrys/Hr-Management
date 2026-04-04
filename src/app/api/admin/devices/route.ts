import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

/**
 * Manage Biometric Devices for a Tenant
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const result = await query(
      'SELECT * FROM tenant_devices WHERE tenant_id = $1 ORDER BY created_at DESC',
      [payload.tenantId]
    );

    return NextResponse.json({ success: true, devices: result.rows });
  } catch (error) {
    console.error('Fetch devices error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { device_id, device_name, device_ip, device_type, location } = await request.json();
    const tenantId = payload.tenantId;

    if (!device_id || !device_ip) {
      return NextResponse.json({ error: 'Device ID and IP are required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO tenant_devices (tenant_id, device_id, device_name, device_ip, device_type, location)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (device_id) DO UPDATE SET
         device_name = EXCLUDED.device_name,
         device_ip = EXCLUDED.device_ip,
         device_type = EXCLUDED.device_type,
         location = EXCLUDED.location,
         updated_at = NOW()
       RETURNING *`,
      [tenantId, device_id, device_name || 'ZK Device', device_ip, device_type || 'ZKTeco', location || 'Main Entrance']
    );

    return NextResponse.json({ success: true, device: result.rows[0] });
  } catch (error) {
    console.error('Create device error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      
      const cookieStore = await cookies();
      const token = cookieStore.get('auth-token')?.value;
      if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
      const payload = await verifyToken(token);
      if (!payload || payload.role?.toLowerCase() !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
  
      await query('DELETE FROM tenant_devices WHERE id = $1 AND tenant_id = $2', [id, payload.tenantId]);
  
      return NextResponse.json({ success: true, message: 'Device removed' });
    } catch (error) {
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }
