import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';

// Process unprocessed biometric logs into attendance records
export async function POST(request: Request) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || 'default';
    const result = await processAttendance(tenantId);

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} logs, created/updated ${result.records} attendance records`,
      ...result,
    });
  } catch (error) {
    console.error('Attendance processing error:', error);
    return NextResponse.json({ error: 'Failed to process attendance' }, { status: 500 });
  }
}

export async function processAttendance(tenantId: string) {
  const logResult = await query(
    `SELECT * FROM biometric_logs WHERE tenant_id = $1 AND processed = false ORDER BY timestamp ASC`,
    [tenantId]
  );
  const unprocessedLogs = logResult.rows;

  if (unprocessedLogs.length === 0) {
    return { processed: 0, records: 0 };
  }

  // Group logs by device_user_id and date
  const grouped: Record<string, any[]> = {};
  for (const log of unprocessedLogs) {
    const dateKey = `${log.device_user_id}_${new Date(log.timestamp).toISOString().split('T')[0]}`;
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(log);
  }

  let recordCount = 0;

  for (const [key, logs] of Object.entries(grouped)) {
    const [deviceUserId, dateStr] = key.split('_');
    const date = dateStr;

    // Find employee by device_user_id from PostgreSQL
    const empResult = await query(
      'SELECT employee_id FROM employees WHERE tenant_id = $1 AND device_user_id = $2 AND is_active = true LIMIT 1',
      [tenantId, deviceUserId]
    );
    const employee = empResult.rows[0];

    if (!employee) {
      // Mark logs as processed even if no employee mapping found
      const logIds = logs.map(l => l.id);
      await query('UPDATE biometric_logs SET processed = true WHERE id = ANY($1)', [logIds]);
      continue;
    }

    // Sort logs by timestamp
    const sortedLogs = logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const firstPunch = new Date(sortedLogs[0].timestamp);
    const lastPunch = sortedLogs.length > 1 ? new Date(sortedLogs[sortedLogs.length - 1].timestamp) : null;

    // Determine status
    const workStartHour = 9; // 9 AM
    let status: 'present' | 'late' | 'half-day' = 'present';

    if (firstPunch.getHours() > workStartHour || 
        (firstPunch.getHours() === workStartHour && firstPunch.getMinutes() > 15)) {
      status = 'late';
    }

    // Calculate working hours
    let workingHours = 0;
    if (lastPunch) {
      workingHours = (lastPunch.getTime() - firstPunch.getTime()) / (1000 * 60 * 60);
      if (workingHours < 4) {
        status = 'half-day';
      }
    } else {
      // Only one punch - mark as half-day
      status = 'half-day';
    }

    const overtime = Math.max(0, workingHours - 8);

    // Upsert attendance record in PostgreSQL
    await query(
      `INSERT INTO attendance (
        employee_id, tenant_id, date, check_in, check_out, status, working_hours, overtime, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (tenant_id, employee_id, date) DO UPDATE SET
        check_in = COALESCE(attendance.check_in, EXCLUDED.check_in),
        check_out = EXCLUDED.check_out,
        status = EXCLUDED.status,
        working_hours = EXCLUDED.working_hours,
        overtime = EXCLUDED.overtime,
        source = 'biometric',
        updated_at = NOW()`,
      [
        employee.employee_id, tenantId, date, 
        firstPunch, lastPunch, status, 
        Math.round(workingHours * 100) / 100, 
        Math.round(overtime * 100) / 100, 
        'biometric'
      ]
    );

    recordCount++;

    // Mark logs as processed
    const logIds = logs.map(l => l.id);
    await query('UPDATE biometric_logs SET processed = true WHERE id = ANY($1)', [logIds]);
  }

  return { processed: unprocessedLogs.length, records: recordCount };
}
