import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

export async function GET(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');

    let queryString = 'SELECT * FROM leaves WHERE tenant_id = $1';
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (status) {
      queryString += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (employeeId) {
      queryString += ` AND employee_id = $${paramIndex++}`;
      params.push(employeeId);
    }

    queryString += ' ORDER BY created_at DESC';
    const result = await query(queryString, params);

    // Map snake_case to camelCase
    const leaves = result.rows.map(row => ({
      ...row,
      employeeId: row.employee_id,
      leaveType: row.leave_type,
      startDate: row.start_date,
      endDate: row.end_date,
      totalDays: row.total_days,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at
    }));

    return NextResponse.json({ success: true, leaves });
  } catch (error) {
    console.error('Get leave error:', error);
    return NextResponse.json({ error: 'Failed to fetch leave records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const body = await request.json();

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const result = await query(
      `INSERT INTO leaves (
        employee_id, tenant_id, leave_type, start_date, end_date, total_days, reason, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        body.employeeId, tenantId, body.leaveType, startDate.toISOString().split('T')[0], 
        endDate.toISOString().split('T')[0], totalDays, body.reason, 'pending'
      ]
    );

    return NextResponse.json({ success: true, leave: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create leave error:', error);
    return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const body = await request.json();
    const { leaveId, action, comments } = body;
    const approvedBy = request.headers.get('x-user-name') || 'admin';

    // Update leave status
    const result = await query(
      `UPDATE leaves SET 
        status = $1, approved_by = $2, approved_at = NOW(), comments = $3, updated_at = NOW()
      WHERE id = $4 AND tenant_id = $5
      RETURNING *`,
      [action === 'approve' ? 'approved' : 'rejected', approvedBy, comments || '', leaveId, tenantId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Leave request not found or unauthorized' }, { status: 404 });
    }

    const leave = result.rows[0];

    // If approved, update attendance records
    if (action === 'approve') {
      const current = new Date(leave.start_date);
      const end = new Date(leave.end_date);

      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        
        await query(
          `INSERT INTO attendance (
            employee_id, tenant_id, date, status, source, notes
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (tenant_id, employee_id, date) DO UPDATE SET
            status = 'on-leave',
            source = 'system',
            notes = EXCLUDED.notes,
            updated_at = NOW()`,
          [leave.employee_id, tenantId, dateStr, 'on-leave', 'system', `${leave.leave_type} leave`]
        );
        current.setDate(current.getDate() + 1);
      }
    }

    return NextResponse.json({ success: true, leave: result.rows[0] });
  } catch (error) {
    console.error('Update leave error:', error);
    return NextResponse.json({ error: 'Failed to update leave' }, { status: 500 });
  }
}
