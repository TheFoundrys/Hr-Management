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

    const user = result.rows[0];
    const names = user.name.split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || 'User';
    const tempUniversityId = `TFU-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create Employee record
    await query(`
      INSERT INTO employees (
        tenant_id, user_id, university_id, first_name, last_name, 
        email, is_active, role
      ) VALUES ($1, $2, $3, $4, $5, $6, true, $7)
      ON CONFLICT (user_id) DO UPDATE SET is_active = true
    `, [
      payload.tenantId, userId, tempUniversityId, 
      firstName, lastName, user.email, newRole
    ]);

    // Audit Log execution
    await query(`
      INSERT INTO audit_logs (action, performed_by, target_id, details)
      VALUES ($1, $2, $3, $4)
    `, [
      'APPROVE_USER_ROLE',
      payload.userId,
      userId,
      JSON.stringify({ new_role: newRole, original_role: 'PENDING', university_id: tempUniversityId })
    ]);

    return NextResponse.json({
      success: true,
      message: 'User approved and employee record created',
      user: user
    });
  } catch (error) {
    console.error('User approval error:', error);
    return NextResponse.json({ error: 'Internal server error while approving user' }, { status: 500 });
  }
}
