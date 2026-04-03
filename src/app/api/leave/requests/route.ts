import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getTenantId } from '@/lib/utils/tenant';

export async function GET(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    const filter = employeeId ? 'AND lr.employee_id = $2' : '';
    const params = employeeId ? [tenantId, employeeId] : [tenantId];

    const result = await query(
      `SELECT lr.*, lt.name as type_name, e.first_name, e.last_name
       FROM leave_requests lr
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       JOIN employees e ON lr.employee_id = e.employee_id
       WHERE lr.tenant_id = $1 ${filter}
       ORDER BY lr.created_at DESC`,
      params
    );

    return NextResponse.json({ success: true, requests: result.rows });
  } catch (error) {
    console.error('Fetch leave requests error:', error);
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId(request);
    const body = await request.json();
    const { employeeId, leaveTypeId, startDate, endDate, reason, isHalfDay, halfDayType, substitutionEmployeeId, attachmentUrl } = body;

    // 0. Get employee department
    const empResult = await query('SELECT department_id FROM employees WHERE employee_id = $1 AND tenant_id = $2', [employeeId, tenantId]);
    if (empResult.rowCount === 0) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    const departmentId = empResult.rows[0].department_id;

    // 1. Calculate total days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = isHalfDay ? 0.5 : (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;

    if (totalDays <= 0) return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });

    // 2. Check for balance
    const balanceResult = await query(
      `SELECT remaining_days FROM leave_balances 
       WHERE employee_id = $1 AND leave_type_id = $2 AND tenant_id = $3 AND year = $4`,
      [employeeId, leaveTypeId, tenantId, new Date().getFullYear()]
    );

    if (balanceResult.rowCount === 0 || Number(balanceResult.rows[0].remaining_days) < totalDays) {
      return NextResponse.json({ error: 'Insufficient leave balance' }, { status: 400 });
    }

    // 3. Academic Constraint: Max 2 from same department on any given date in the range
    const quotaResult = await query(
      `SELECT COUNT(*) as count, start_date, end_date FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.employee_id
       WHERE e.department_id = $1 AND lr.tenant_id = $2 AND lr.status = 'approved'
       AND (
        (lr.start_date <= $3 AND lr.end_date >= $3) OR
        (lr.start_date <= $4 AND lr.end_date >= $4) OR
        (lr.start_date >= $3 AND lr.end_date <= $4)
       ) GROUP BY lr.start_date, lr.end_date`,
      [departmentId, tenantId, startDate, endDate]
    );

    if (quotaResult.rows.some(r => Number(r.count) >= 2)) {
      return NextResponse.json({ error: 'Departmental leave quota exceeded for these dates (Max 2 faculty)' }, { status: 400 });
    }

    // 4. Check for overlapping requests for this employee
    const overlapResult = await query(
      `SELECT id FROM leave_requests 
       WHERE employee_id = $1 AND tenant_id = $2 AND status != 'rejected' AND status != 'cancelled'
       AND (
        (start_date <= $3 AND end_date >= $3) OR
        (start_date <= $4 AND end_date >= $4) OR
        (start_date >= $3 AND end_date <= $4)
       )`,
      [employeeId, tenantId, startDate, endDate]
    );

    if (overlapResult.rowCount && overlapResult.rowCount > 0) {
      return NextResponse.json({ error: 'You already have a leave request for these dates' }, { status: 400 });
    }

    // 5. Create request
    const result = await query(
      `INSERT INTO leave_requests (
        employee_id, leave_type_id, tenant_id, start_date, end_date, total_days, reason, 
        is_half_day, half_day_type, substitution_employee_id, attachment_url, current_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1)
      RETURNING *`,
      [employeeId, leaveTypeId, tenantId, startDate, endDate, totalDays, reason, isHalfDay, halfDayType, substitutionEmployeeId, attachmentUrl]
    );

    return NextResponse.json({ success: true, request: result.rows[0] });
  } catch (error) {
    console.error('Apply leave error:', error);
    return NextResponse.json({ error: 'Failed to apply for leave' }, { status: 500 });
  }
}
