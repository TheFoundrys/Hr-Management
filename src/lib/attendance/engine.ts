import { query } from '@/lib/db/postgres';

/**
 * Batch insert raw biometric logs (Standard schema: device_user_id, timestamp, tenant_id)
 */
export async function batchInsertLogs(logs: any[], tenantId: string, deviceId: string) {
  if (!logs.length) return 0;

  let totalInserted = 0;
  const CHUNK_SIZE = 500; // Safe chunk size for SQL parameters

  for (let i = 0; i < logs.length; i += CHUNK_SIZE) {
    const chunk = logs.slice(i, i + CHUNK_SIZE);
    const values: any[] = [];
    const placeholders: string[] = [];
    let index = 1;

    for (const log of chunk) {
      // Highly resilient log field detection
      const userId = (log.deviceUserId || log.userId || log.uid || log.userSn || '').toString();
      const time = log.recordTime || log.timestamp || log.time;
      
      if (!userId || !time) continue;

      placeholders.push(`($${index++}, $${index++}, $${index++}, $${index++}, $${index++})`);
      values.push(
        userId, 
        new Date(time), 
        tenantId, // Must be a valid UUID
        deviceId || 'UNKNOWN-DEVICE', 
        JSON.stringify(log)
      );
    }

    if (placeholders.length > 0) {
      const sql = `
        INSERT INTO biometric_logs (device_user_id, timestamp, tenant_id, device_id, raw_data)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (device_user_id, timestamp, tenant_id) DO NOTHING;
      `;
      await query(sql, values);
      totalInserted += chunk.length;
    }
  }

  return totalInserted;
}

/**
 * PRODUCTION-READY Attendance Calculation
 * Standardized Mapping: biometric_logs.device_user_id → employees.biometric_id
 */
export async function processAttendance(tenantId: string, dateStr: string) {
  // 1. Get all unique biometric IDs from logs for the day
  const logsResult = await query(
    `SELECT DISTINCT device_user_id 
     FROM biometric_logs 
     WHERE tenant_id = $1 AND DATE(timestamp) = $2`,
    [tenantId, dateStr]
  );

  let recordCount = 0;
  let skipCount = 0;

  for (const { device_user_id } of logsResult.rows) {
    // 2. Direct Identity Mapping (MANDATORY) - Fetch UUID 'id'
    const empResult = await query(
      `SELECT id FROM employees 
       WHERE tenant_id = $1 AND biometric_id = $2`,
      [tenantId, device_user_id]
    );
    
    const employee = empResult.rows[0];

    // If no mapping found, skip log for debugging
    if (!employee) {
      console.warn(`[ENGINE] Skipping unmapped device_user_id: ${device_user_id} for tenant: ${tenantId}`);
      skipCount++;
      continue;
    }

    // 3. Simple Punch Logic: First-In, Last-Out
    const dayLogsResult = await query(
      `SELECT timestamp FROM biometric_logs 
       WHERE device_user_id = $1 AND tenant_id = $2 AND DATE(timestamp) = $3
       ORDER BY timestamp ASC`,
      [device_user_id, tenantId, dateStr]
    );
    const dayLogs = dayLogsResult.rows;

    if (dayLogs.length === 0) continue;

    const firstPunch = new Date(dayLogs[0].timestamp);
    const lastPunch = dayLogs.length > 1 ? new Date(dayLogs[dayLogs.length - 1].timestamp) : null;
    const workingHours = lastPunch ? (lastPunch.getTime() - firstPunch.getTime()) / (1000 * 60 * 60) : 0;
    
    // 4. Update core attendance record using UUID employee.id
    await query(
      `INSERT INTO attendance (employee_id, tenant_id, date, check_in, check_out, working_hours, source, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'biometric', 'PRESENT')
       ON CONFLICT (employee_id, tenant_id, date) DO UPDATE SET
         check_in = EXCLUDED.check_in,
         check_out = EXCLUDED.check_out,
         working_hours = EXCLUDED.working_hours,
         status = 'PRESENT',
         updated_at = NOW()`,
      [employee.id, tenantId, dateStr, firstPunch, lastPunch, Math.round(workingHours * 100) / 100]
    );
    recordCount++;
  }

  return { 
    processed: logsResult.rows.length, 
    records: recordCount, 
    skipped: skipCount 
  };
}

/**
 * AUTO-LINK: Triggered after employee creation
 * Ensures historical logs are processed for the new employee
 */
export async function autoLinkBiometric(biometricId: string, tenantId: string) {
  if (!biometricId) return;

  try {
    // 1. Check if logs already exist for this ID
    const logsExist = await query(
      'SELECT 1 FROM biometric_logs WHERE device_user_id = $1 AND tenant_id = $2 LIMIT 1',
      [biometricId, tenantId]
    );

    if (logsExist.rows.length > 0) {
      console.log(`[AUTO-LINK] Found historical logs for ${biometricId}. Triggering processing...`);
      
      // 2. Process attendance for the last 7 days (to be safe/efficient)
      const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      });

      for (const date of dates) {
        await processAttendance(tenantId, date);
      }
    }
  } catch (err) {
    console.error(`[AUTO-LINK] Failure for ${biometricId}:`, err);
  }
}
