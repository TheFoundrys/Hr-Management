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
  try {
    // Optimized: Single query to calculate punches for all mapped employees at once
    const result = await query(
      `WITH daily_punches AS (
         SELECT 
           e.id as employee_uuid,
           bl.device_user_id,
           MIN(bl.timestamp) as first_punch,
           MAX(bl.timestamp) as last_punch
         FROM biometric_logs bl
         JOIN employees e ON bl.device_user_id = e.biometric_id::TEXT AND bl.tenant_id::UUID = $1::UUID
         WHERE bl.tenant_id::UUID = $1::UUID AND bl.timestamp >= $2::DATE AND bl.timestamp < ($2::DATE + INTERVAL '1 day')
         GROUP BY e.id, bl.device_user_id
       )
       INSERT INTO attendance (employee_id, tenant_id, date, check_in, check_out, working_hours, source, status)
       SELECT 
         employee_uuid, 
         $1, 
         $2, 
         first_punch, 
         CASE WHEN first_punch = last_punch THEN NULL ELSE last_punch END, 
         ROUND(EXTRACT(EPOCH FROM (last_punch - first_punch)) / 3600, 2),
         'biometric',
         CASE 
           WHEN first_punch::TIME > '10:00:00'::TIME THEN 'LATE'
           ELSE 'PRESENT'
         END
       FROM daily_punches
       ON CONFLICT (employee_id, tenant_id, date) DO UPDATE SET
         check_in = EXCLUDED.check_in,
         check_out = EXCLUDED.check_out,
         working_hours = EXCLUDED.working_hours,
         status = EXCLUDED.status,
         updated_at = NOW()
       RETURNING employee_id`,
      [tenantId, dateStr]
    );

    return { 
      processed: result.rowCount, 
      records: result.rowCount, 
      skipped: 0 // Skipped unmapped IDs are handled gracefully by the JOIN filter
    };
  } catch (error) {
    console.error(`[ENGINE] Failed to process attendance for ${dateStr}:`, error);
    throw error;
  }
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
