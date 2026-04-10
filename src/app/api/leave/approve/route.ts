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

    // 0. Self-Healing: Verify and heal Approver Identity if needed
    let activeApproverId = approverId;
    
    // Check if approver exists as an employee
    const approverCheck = await query('SELECT id FROM employees WHERE employee_id = $1 AND tenant_id = $2', [activeApproverId, tenantId]);
    
    if (approverCheck.rowCount === 0) {
      // If approverId is null or missing record, try to heal from User table
      const userResult = await query('SELECT id, name, email, employee_id FROM users WHERE (employee_id = $1 OR employee_id IS NULL) AND tenant_id = $2 LIMIT 1', [approverId, tenantId]);
      
      if (userResult.rowCount && userResult.rowCount > 0) {
        const user = userResult.rows[0];
        const names = user.name.split(' ');
        const firstName = names[0];
        const lastName = names.slice(1).join(' ') || 'User';
        const newEmpId = user.employee_id || `TFU-AUTO-${Date.now().toString().slice(-6)}`;
        const defaultDept = '0bd710c2-bb92-4c77-a67f-013573f25cc0';

        // Re-check employee creation to handle race condition
        const finalEmpCheck = await query('SELECT employee_id FROM employees WHERE email = $1 AND tenant_id = $2', [user.email, tenantId]);
        
        if (finalEmpCheck.rowCount === 0) {
          await query(
            `INSERT INTO employees (employee_id, university_id, first_name, last_name, email, tenant_id, department_id, user_id, is_active)
             VALUES ($1, $1, $2, $3, $4, $5, $6, $7, true)`,
            [newEmpId, firstName, lastName, user.email, tenantId, defaultDept, user.id]
          );
          await query('UPDATE users SET employee_id = $1, is_active = true WHERE id = $2', [newEmpId, user.id]);
          activeApproverId = newEmpId;
        } else {
          activeApproverId = finalEmpCheck.rows[0].employee_id;
        }
      } else {
        return NextResponse.json({ error: 'Approver identity failed validation' }, { status: 404 });
      }
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
        [requestId, activeApproverId, tenantId, currentLevel, 'rejected', remarks]
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

      // Perform Balance Deduction (ensure balance exists first)
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
      [requestId, activeApproverId, tenantId, currentLevel, 'approved', remarks]
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
