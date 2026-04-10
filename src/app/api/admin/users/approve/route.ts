import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { verifyToken } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { hasPermission } from '@/lib/auth/rbac';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    // Ensure the actor is an admin/hr who can manage employees
    if (!hasPermission(payload.role, 'MANAGE_EMPLOYEES')) {
      return NextResponse.json({ error: 'Forbidden: Missing MANAGE_EMPLOYEES permission' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, newRole } = body;

    if (!userId || !newRole) {
      return NextResponse.json({ error: 'Missing userId or newRole' }, { status: 400 });
    }

    // Update user status
    const result = await query(`
      UPDATE users 
      SET role = $1, is_active = true, updated_at = NOW() 
      WHERE id = $2 AND tenant_id = $3
      RETURNING id, name, email, role
    `, [newRole, userId, payload.tenantId]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'User not found or forbidden' }, { status: 404 });
    }

    // Audit Log execution
    await query(`
      INSERT INTO audit_logs (action, performed_by, target_id, details)
      VALUES ($1, $2, $3, $4)
    `, [
      'APPROVE_USER_ROLE',
      payload.userId,
      userId,
      JSON.stringify({ new_role: newRole, original_role: 'PENDING' })
    ]);

    return NextResponse.json({
      success: true,
      message: 'User approved and role assigned successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('User approval error:', error);
    return NextResponse.json({ error: 'Internal server error while approving user' }, { status: 500 });
  }
}
