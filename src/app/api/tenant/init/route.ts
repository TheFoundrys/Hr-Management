import { NextResponse } from 'next/server';
import { globalTenantManager } from '@/lib/multiTenant';

export async function POST(request: Request) {
  try {
    const { name, domain, subdomain, settings } = await request.json();

    if (!name || !subdomain) {
      return NextResponse.json({
        error: 'Name and subdomain are required'
      }, { status: 400 });
    }

    const tenant = await globalTenantManager.createTenant({
      name,
      domain: domain || `${subdomain}.yourdomain.com`,
      subdomain,
      database: `hr_${subdomain}`,
      settings: settings || {
        timezone: 'UTC',
        workingHours: { start: '09:00', end: '18:00' },
        attendanceRules: { gracePeriod: 15, overtimeThreshold: 8 },
        deviceTypes: ['ZKTeco', 'Anviz', 'Realtime']
      }
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        domain: tenant.domain,
        accessUrl: `https://${tenant.subdomain}.yourdomain.com`
      }
    });

  } catch (error) {
    console.error('Tenant creation error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create tenant'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const tenants = await globalTenantManager.getAllTenants();

    return NextResponse.json({
      success: true,
      tenants: tenants.map(t => ({
        id: t.id,
        name: t.name,
        subdomain: t.subdomain,
        domain: t.domain,
        accessUrl: `https://${t.subdomain}.yourdomain.com`,
        createdAt: t.createdAt
      }))
    });

  } catch (error) {
    console.error('Failed to get tenants:', error);
    return NextResponse.json({
      error: 'Failed to get tenants'
    }, { status: 500 });
  }
}
