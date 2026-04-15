import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { verifyToken } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { hashPassword } from '@/lib/auth/password';

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

    const { name, adminEmail, adminName, adminPassword } = await request.json();

    if (!name || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Auto-generate a slug for subdomain (internal use only)
    const generatedSubdomain = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

    // 1. Create Tenant
    const tenantResult = await query(
      'INSERT INTO tenants (name, subdomain) VALUES ($1, $2) RETURNING id',
      [name, generatedSubdomain]
    );
    const tenantId = tenantResult.rows[0].id;

    // 2. Create Default Admin User for this tenant
    const passwordHash = await hashPassword(adminPassword);
    const userResult = await query(
      `INSERT INTO users (name, email, password_hash, role, tenant_id, is_active, is_verified)
       VALUES ($1, $2, $3, 'ADMIN', $4, true, true)
       RETURNING id`,
      [adminName || 'Admin', adminEmail.toLowerCase(), passwordHash, tenantId]
    );

    return NextResponse.json({
      success: true,
      message: 'Tenant and admin user created successfully',
      tenantId: tenantId,
      userId: userResult.rows[0].id
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create tenant error:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Subdomain or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
