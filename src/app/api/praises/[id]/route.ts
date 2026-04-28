import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';
import { verifyToken } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { hasPermission } from '@/lib/auth/rbac';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenantId = await getTenantId(request);
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    // Ensure the user is an admin or has permission to delete praises
    // For now, any admin (has VIEW_ALL_EMPLOYEES or similar) can delete
    const role = (request.headers.get('x-user-role') || 'staff').toUpperCase();
    if (role !== 'SUPER_ADMIN' && !hasPermission(role, 'VIEW_ALL_EMPLOYEES')) {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const result = await query(
      'DELETE FROM praises WHERE id = $1 AND tenant_id = $2 RETURNING id', 
      [id, tenantId]
    );

    if ((result.rowCount || 0) === 0) {
      return NextResponse.json({ error: 'Praise not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Praise DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete praise' }, { status: 500 });
  }
}
