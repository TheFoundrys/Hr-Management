import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

async function ensureTableExists() {
  // First, create the table if it doesn't exist (without constraint)
  await query(`
    CREATE TABLE IF NOT EXISTS support_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id VARCHAR(100) NOT NULL,
      tenant_id VARCHAR(100) NOT NULL DEFAULT 'default',
      category VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'Approved', 'Rejected', 'Completed')),
      admin_comments TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Try to drop the old constraint if it exists from a previous run
  try {
    await query(`ALTER TABLE support_requests DROP CONSTRAINT IF EXISTS support_requests_category_check`);
  } catch (e) {
    // Ignore if it fails
  }
}


export async function GET(request: Request) {
  try {
    await ensureTableExists();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { employeeId, tenantId, role } = payload;

    let result;
    if (['ADMIN', 'HR', 'SUPER_ADMIN'].includes(role)) {
      result = await query(
        `SELECT sr.*, e.first_name || ' ' || e.last_name as employee_name 
         FROM support_requests sr
         JOIN employees e ON sr.employee_id = e.employee_id
         WHERE sr.tenant_id = $1 
         ORDER BY sr.created_at DESC`,
        [tenantId]
      );
    } else {
      result = await query(
        `SELECT * FROM support_requests 
         WHERE employee_id = $1 AND tenant_id = $2 
         ORDER BY created_at DESC`,
        [employeeId, tenantId]
      );
    }

    return NextResponse.json({ success: true, requests: result.rows });
  } catch (error) {
    console.error('Fetch support requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureTableExists();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { employeeId, tenantId } = payload;
    const body = await request.json();
    const { category, description } = body;

    if (!category || !description) {
      return NextResponse.json({ error: 'Category and description are required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO support_requests (employee_id, tenant_id, category, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [employeeId, tenantId, category, description]
    );

    return NextResponse.json({ success: true, request: result.rows[0] });
  } catch (error) {
    console.error('Create support request error:', error);
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
