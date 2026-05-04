import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { verifyQrToken } from '@/lib/utils/qr';
import { validateNetworkAccess, getClientIp } from '@/lib/attendance/network-validator';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';


/**
 * Standardized Ingestion API
 * Decoupled from specific capture hardware/software
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceType, token, employeeId: manualEmployeeId, tenantId: manualTenantId } = body;

    let employeeId = manualEmployeeId;
    let tenantId = manualTenantId;

    // 1. Decoupled Token/Session Verification
    if (sourceType === 'qr') {
      if (!token) return NextResponse.json({ error: 'QR token required' }, { status: 400 });
      
      const verification = verifyQrToken(token);
      if (!verification.success) {
        return NextResponse.json({ error: `Verification failed: ${verification.error}` }, { status: 401 });
      }
      employeeId = verification.employeeId;
      tenantId = verification.tenantId;
    } else if (sourceType === 'web') {
      // Secure Web Attendance
      const cookieStore = await cookies();
      const sessionToken = cookieStore.get('auth-token')?.value;
      if (!sessionToken) return NextResponse.json({ error: 'Session required for web attendance' }, { status: 401 });
      
      const payload = await verifyToken(sessionToken);
      if (!payload || (employeeId && payload.employeeId !== employeeId)) {
        return NextResponse.json({ error: 'Unauthorized web attendance' }, { status: 403 });
      }
      employeeId = payload.employeeId; // Always use payload ID for web
      tenantId = payload.tenantId;
    } else {
      return NextResponse.json({ error: 'Invalid or missing capture source' }, { status: 400 });
    }

    if (!employeeId || !tenantId) {
      return NextResponse.json({ error: 'Identity and Tenant required' }, { status: 400 });
    }

    // 1.1. Dynamic IP Validation (Tenant-Aware)
    const clientIp = getClientIp(request.headers);
    const networkValidation = await validateNetworkAccess(tenantId, clientIp);

    if (!networkValidation.allowed) {
      console.warn(`[SECURITY] IP Validation Failed: ${networkValidation.reason}`);
      return NextResponse.json({ error: networkValidation.reason }, { status: 403 });
    }

    // 2. Validate Employee Existence
    const empResult = await query(
      "SELECT id, first_name || ' ' || last_name as name FROM employees WHERE university_id = $1 AND tenant_id = $2",
      [employeeId, tenantId]
    );
    if ((empResult.rowCount || 0) === 0) {
      return NextResponse.json({ error: 'Employee not found in this tenant' }, { status: 404 });
    }
    const internalEmployeeId = empResult.rows[0].id;
    const employeeName = empResult.rows[0].name;

    // 3. Duplicate Prevention (e.g., within 5 minutes)
    const today = new Date().toISOString().split('T')[0];
    const recentResult = await query(
      `SELECT id FROM attendance 
       WHERE employee_id = $1 AND tenant_id = $2 AND date = $3
       AND created_at > NOW() - INTERVAL '5 minutes'`,
      [internalEmployeeId, tenantId, today]
    );
    if ((recentResult.rowCount || 0) > 0) {
      return NextResponse.json({ error: 'Duplicate scan. Please wait 5 minutes.' }, { status: 429 });
    }

    // 4. Determine Status (Simple logic: first of day is check-in, rest are check-out updates)
    const existingResult = await query(
      'SELECT id, check_in, status FROM attendance WHERE employee_id = $1 AND tenant_id = $2 AND date = $3',
      [internalEmployeeId, tenantId, today]
    );

    let result;
    const isFirstTime = (existingResult.rowCount || 0) === 0 || (existingResult.rows[0].status === 'ON_LEAVE' && !existingResult.rows[0].check_in);

    if (isFirstTime) {
      // Create or Update record (Check-in)
      const now = new Date();
      const isLate = now.getHours() >= 10;
      const newStatus = isLate ? 'LATE' : 'PRESENT';

      if ((existingResult.rowCount || 0) > 0 && existingResult.rows[0].status === 'ON_LEAVE') {
        // REFUND LOGIC: If they were on leave but showed up, refund the balance
        console.log(`[REFUND] Employee ${internalEmployeeId} showed up on leave day. Refunding 1 day.`);
        
        // 1. Find the leave request that covered today to get the leave_type_id
        const lrResult = await query(
          `SELECT leave_type_id FROM leave_requests 
           WHERE employee_id = $1 AND tenant_id = $2 AND status = 'approved'
           AND $3::date >= start_date::date AND $3::date <= end_date::date
           LIMIT 1`,
          [internalEmployeeId, tenantId, today]
        );

        if ((lrResult.rowCount || 0) > 0) {
          const leaveTypeId = lrResult.rows[0].leave_type_id;
          // 2. Increment balance
          await query(
            `UPDATE leave_balances 
             SET used_days = used_days - 1, 
                 remaining_days = remaining_days + 1
             WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3`,
            [internalEmployeeId, leaveTypeId, new Date().getFullYear()]
          );
        }

        // 3. Update the attendance record
        result = await query(
          `UPDATE attendance 
           SET check_in = NOW(), status = $1, source = $2, updated_at = NOW()
           WHERE id = $3 RETURNING *`,
          [newStatus, sourceType, existingResult.rows[0].id]
        );
      } else {
        // Standard Check-in
        result = await query(
          `INSERT INTO attendance (employee_id, tenant_id, date, check_in, status, source)
           VALUES ($1, $2, $3, NOW(), $5, $4)
           RETURNING *`,
          [internalEmployeeId, tenantId, today, sourceType, newStatus]
        );
      }
    } else {
      // Update existing record (Check-out) and calculate hours
      result = await query(
        `UPDATE attendance 
         SET check_out = NOW(), 
             working_hours = ROUND(CAST(EXTRACT(EPOCH FROM (NOW() - check_in)) / 3600 AS NUMERIC), 2),
             updated_at = NOW()
         WHERE employee_id = $1 AND tenant_id = $2 AND date = $3
         RETURNING *`,
        [internalEmployeeId, tenantId, today]
      );
    }

    // 5. Emit Real-time event
    try {
      const { attendanceEvents } = require('@/lib/utils/events');
      attendanceEvents.emit('attendance_event', {
        type: (existingResult.rowCount || 0) === 0 ? 'check_in' : 'check_out',
        employeeId,
        employeeName,
        tenantId,
        timestamp: new Date().toISOString(),
        data: result.rows[0]
      });
    } catch (e) {
      console.warn('Real-time event emission failed (ignoring)', e);
    }

    return NextResponse.json({ 
      success: true, 
      data: result.rows[0],
      type: (existingResult.rowCount || 0) === 0 ? 'check_in' : 'check_out'
    });

  } catch (error) {
    console.error('Ingestion error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
