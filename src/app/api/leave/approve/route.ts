import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);

    const result = await query(
      `SELECT lr.*, e.first_name, e.last_name, lt.name as type_name
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.employee_id
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       WHERE lr.tenant_id = $1 AND lr.status = 'pending'
       ORDER BY lr.created_at ASC`,
      [tenantId]
    );

    return NextResponse.json({ success: true, pendingRequests: result.rows });
  } catch (error) {
    console.error('Fetch pending leaves error:', error);
    return NextResponse.json({ error: 'Failed to fetch pending leaves' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const body = await request.json();
    const { requestId, status, remarks, approverId } = body;

    if (!['approved', 'rejected'].includes(status)) {
       return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // 1. Get current state of the request
    const reqResult = await query(
      'SELECT current_level, employee_id, leave_type_id, total_days, start_date, end_date FROM leave_requests WHERE id = $1 AND tenant_id = $2',
      [requestId, tenantId]
    );

    if (reqResult.rowCount === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const req = reqResult.rows[0];
    const currentLevel = req.current_level || 1;

    // 2. Handle Rejection
    if (status === 'rejected') {
      await query(
        'UPDATE leave_requests SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
        ['rejected', requestId, tenantId]
      );
      await query(
        `INSERT INTO leave_approvals (leave_request_id, approver_id, tenant_id, level, status, remarks, action_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [requestId, approverId, tenantId, currentLevel, 'rejected', remarks]
      );
      return NextResponse.json({ success: true, message: 'Request rejected' });
    }

    // 3. Handle Approval
    const nextLevel = currentLevel + 1;
    const isFinalApproval = currentLevel >= 3;

    if (!isFinalApproval) {
      // Advance to next level
      await query(
        'UPDATE leave_requests SET current_level = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
        [nextLevel, requestId, tenantId]
      );
    } else {
      // Final level approval (HR/Registrar)
      await query(
        'UPDATE leave_requests SET status = $1, current_level = $2, updated_at = NOW() WHERE id = $3 AND tenant_id = $4',
        ['approved', 3, requestId, tenantId]
      );

      // Perform Balance Deduction
      await query(
        `UPDATE leave_balances 
         SET used_days = used_days + $1, remaining_days = remaining_days - $1, updated_at = NOW()
         WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
        [req.total_days, req.employee_id, req.leave_type_id, new Date().getFullYear()]
      );

      // Multi-day Attendance Sync
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      let curr = new Date(start);
      while (curr <= end) {
        await query(
          `INSERT INTO attendance (employee_id, tenant_id, date, status, source)
           VALUES ($1, $2, $3, 'on-leave', 'system')
           ON CONFLICT (employee_id, tenant_id, date) DO UPDATE SET status = 'on-leave'`,
          [req.employee_id, tenantId, curr.toISOString().split('T')[0]]
        );
        curr.setDate(curr.getDate() + 1);
      }
    }

    // Log the approval action
    await query(
      `INSERT INTO leave_approvals (leave_request_id, approver_id, tenant_id, level, status, remarks, action_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [requestId, approverId, tenantId, currentLevel, 'approved', remarks]
    );

    return NextResponse.json({ 
      success: true, 
      message: isFinalApproval ? 'Request fully approved' : `Level ${currentLevel} approval successful. Moved to Level ${nextLevel}.` 
    });
  } catch (error) {
    console.error('Approve leave error:', error);
    return NextResponse.json({ error: 'Failed to process leave approval' }, { status: 500 });
  }
}
