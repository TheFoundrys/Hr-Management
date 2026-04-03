import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { verifyQrToken } from '@/lib/utils/qr';
import { validateNetworkAccess, getClientIp } from '@/lib/attendance/network-validator';


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

    // 1. Decoupled Token Verification
    if (sourceType === 'qr') {
      if (!token) return NextResponse.json({ error: 'QR token required' }, { status: 400 });
      
      const verification = verifyQrToken(token);
      if (!verification.success) {
        return NextResponse.json({ error: `Verification failed: ${verification.error}` }, { status: 401 });
      }
      employeeId = verification.employeeId;
      tenantId = verification.tenantId;
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
      'SELECT id FROM employees WHERE university_id = $1 AND tenant_id = $2',
      [employeeId, tenantId]
    );
    if (empResult.rowCount === 0) {
      return NextResponse.json({ error: 'Employee not found in this tenant' }, { status: 404 });
    }
    const internalEmployeeId = empResult.rows[0].id;

    // 3. Duplicate Prevention (e.g., within 5 minutes)
    const today = new Date().toISOString().split('T')[0];
    const recentResult = await query(
      `SELECT id FROM attendance 
       WHERE employee_id = $1 AND tenant_id = $2 AND date = $3
       AND created_at > NOW() - INTERVAL '5 minutes'`,
      [internalEmployeeId, tenantId, today]
    );
    if (recentResult.rowCount && recentResult.rowCount > 0) {
      return NextResponse.json({ error: 'Duplicate scan. Please wait 5 minutes.' }, { status: 429 });
    }

    // 4. Determine Status (Simple logic: first of day is check-in, rest are check-out updates)
    const existingResult = await query(
      'SELECT id, check_in FROM attendance WHERE employee_id = $1 AND tenant_id = $2 AND date = $3',
      [internalEmployeeId, tenantId, today]
    );

    let result;
    if (existingResult.rowCount === 0) {
      // Create new daily record (Check-in)
      result = await query(
        `INSERT INTO attendance (employee_id, tenant_id, date, check_in, status, source)
         VALUES ($1, $2, $3, NOW(), 'PRESENT', $4)
         RETURNING *`,
        [internalEmployeeId, tenantId, today, sourceType]
      );
    } else {
      // Update existing record (Check-out)
      result = await query(
        `UPDATE attendance SET check_out = NOW(), updated_at = NOW()
         WHERE employee_id = $1 AND tenant_id = $2 AND date = $3
         RETURNING *`,
        [internalEmployeeId, tenantId, today]
      );
    }

    // 5. Emit Real-time event
    try {
      const { attendanceEvents } = require('@/lib/utils/events');
      attendanceEvents.emit('attendance_event', {
        type: existingResult.rowCount === 0 ? 'check_in' : 'check_out',
        employeeId,
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
      type: existingResult.rowCount === 0 ? 'check_in' : 'check_out'
    });

  } catch (error) {
    console.error('Ingestion error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
