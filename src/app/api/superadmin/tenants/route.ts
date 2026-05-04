import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { verifyToken } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { handleTenantOnboard } from '../../../../../controllers/tenantOnboarding';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await query('SELECT * FROM tenants ORDER BY created_at DESC');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Fetch tenants error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, adminEmail, adminName, adminPassword, tenantType = 'EDUCATION', orgType = 'university' } = body;

    if (!name || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Map simple superadmin input to rich onboarding structure
    const onboardingPayload = {
      org: {
        name: name,
        org_type: orgType,
        org_size: '1-50',
        address: 'N/A',
        country: 'India',
        timezone: 'Asia/Kolkata',
        tenant_type: tenantType
      },
      admin: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminName || 'Admin'
      },
      hierarchy: {
        reporting_type: 'linear',
        label_vocabulary: tenantType === 'EDUCATION' ? 'university' : 'corporate'
      },
      modules: {
        leave: true,
        attendance: true,
        payroll: true,
        performance: true,
        recruitment: true,
        documents: true
      },
      structure: {
        source: 'template',
        template_id: tenantType === 'EDUCATION' ? 'template-university-std' : 'template-corporate-std'
      }
    };

    const result = await handleTenantOnboard({ body: onboardingPayload });

    return NextResponse.json(result.data, { status: result.status });

  } catch (error: any) {
    console.error('Unified Create tenant error:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Subdomain or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
