import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

/**
 * Update Tenant Attendance Settings (e.g., toggle IP validation)
 */
export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { enable_ip_validation } = await request.json();
    const tenantId = payload.tenantId;

    // Fetch current settings
    const tenantResult = await query('SELECT settings FROM tenants WHERE id = $1', [tenantId]);
    const currentSettings = tenantResult.rows[0]?.settings || {};

    // Update settings
    const updatedSettings = {
      ...currentSettings,
      enable_ip_validation: !!enable_ip_validation
    };

    await query(
      'UPDATE tenants SET settings = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(updatedSettings), tenantId]
    );

    return NextResponse.json({ success: true, settings: updatedSettings });

  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Get Tenant Attendance Settings
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const tenantResult = await query('SELECT settings FROM tenants WHERE id = $1', [payload.tenantId]);
    return NextResponse.json({ success: true, settings: tenantResult.rows[0]?.settings || {} });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
