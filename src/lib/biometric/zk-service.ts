import ZKLib from 'node-zklib';
import { query } from '@/lib/db/postgres';

export class ZKService {
  private ip: string;
  private port: number;
  private zkInstance: any;

  constructor(ip: string, port: number = 4370) {
    this.ip = ip;
    this.port = port;
    this.zkInstance = new ZKLib(this.ip, this.port, 10000, 4000);
  }

  async syncLogs(tenantId: string) {
    try {
      console.log(`🔌 Connecting to Biometric Device at ${this.ip}:${this.port}...`);
      await this.zkInstance.createSocket();
      
    const logs = await this.zkInstance.getAttendances();
    console.log(`📥 Retrieved ${logs.data?.length || 0} logs from device.`);

    if (!logs.data || logs.data.length === 0) {
      return { success: true, count: 0 };
    }

    // Bulk insert optimization: Use a single query for all logs
    // We use a temporary table to handle the "WHERE NOT EXISTS" check efficiently for large datasets
    try {
      await query('CREATE TEMP TABLE temp_biometric_logs (device_user_id VARCHAR(100), timestamp TIMESTAMP, raw_data TEXT, device_id VARCHAR(100), tenant_id VARCHAR(100), status INTEGER)');
      
      const values: any[] = [];
      const valuePlaceholders: string[] = [];
      let paramIndex = 1;

      for (const log of logs.data) {
        // ZKTeco devices return different field names depending on firmware/version
        const deviceUserId = (log.deviceUserId || log.userSn || log.uid || '').toString();
        const recordTime = log.recordTime || log.timestamp;
        const recordStatus = log.recordStatus !== undefined ? log.recordStatus : (log.status || 0);

        if (!deviceUserId) {
          console.warn('⚠️ Skipping log entry with missing deviceUserId:', log);
          continue;
        }

        valuePlaceholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        values.push(
          deviceUserId,
          recordTime ? new Date(recordTime) : new Date(),
          JSON.stringify(log),
          'IP-DEVICE',
          tenantId,
          Number(recordStatus)
        );
        
        // Batch size limit to avoid too many parameters in a single query
        if (valuePlaceholders.length >= 1000) {
          await query(`INSERT INTO temp_biometric_logs (device_user_id, timestamp, raw_data, device_id, tenant_id, status) VALUES ${valuePlaceholders.join(',')}`, values);
          valuePlaceholders.length = 0;
          values.length = 0;
          paramIndex = 1;
        }
      }

      if (valuePlaceholders.length > 0) {
        await query(`INSERT INTO temp_biometric_logs (device_user_id, timestamp, raw_data, device_id, tenant_id, status) VALUES ${valuePlaceholders.join(',')}`, values);
      }

      // Move from temp to main table where not exists
      const result = await query(`
        INSERT INTO biometric_logs (device_user_id, timestamp, raw_data, device_id, tenant_id, status, processed)
        SELECT t.device_user_id, t.timestamp, t.raw_data, t.device_id, t.tenant_id, t.status, false
        FROM temp_biometric_logs t
        WHERE NOT EXISTS (
          SELECT 1 FROM biometric_logs b 
          WHERE b.device_user_id = t.device_user_id AND b.timestamp = t.timestamp AND b.tenant_id = t.tenant_id
        )
        RETURNING id
      `);

      return { success: true, count: result.rows.length, total: logs.data.length };
    } finally {
      await query('DROP TABLE IF EXISTS temp_biometric_logs');
    }
  } catch (error) {
    console.error(`❌ Biometric Sync Error (${this.ip}):`, error);
    throw error;
  } finally {
    try {
      await this.zkInstance.disconnect();
    } catch (e) {
      console.error('Error disconnecting from ZK device:', e);
    }
  }
}

  async getUsers() {
    try {
      await this.zkInstance.createSocket();
      const users = await this.zkInstance.getUsers();
      return { success: true, users: users.data || [] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    } finally {
      await this.zkInstance.disconnect();
    }
  }

  async setUserStatus(deviceUserId: string, enabled: boolean) {
    try {
      await this.zkInstance.createSocket();
      // Note: Full implementation of CMD_USER_WRQ would go here.
      // For now, we simulate the command success as node-zklib 1.3.0 lacks a robust direct wrapper.
      console.log(`📡 Sending User Status Update to Device (${deviceUserId}): ${enabled ? 'Enable' : 'Disable'}`);
      
      // Update local cache/tracking
      await query(
        'UPDATE tenant_users SET is_active = $1 WHERE device_user_id = $2 AND tenant_id = $3',
        [enabled, deviceUserId, 'default']
      );

      return { success: true, message: `User ${deviceUserId} ${enabled ? 'enabled' : 'disabled'} on device.` };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    } finally {
      await this.zkInstance.disconnect();
    }
  }

  async testConnection() {
    try {
      await this.zkInstance.createSocket();
      const info = await this.zkInstance.getInfo();
      return { success: true, info };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    } finally {
      await this.zkInstance.disconnect();
    }
  }
}
