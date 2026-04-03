import cron from 'node-cron';
import { ZKService } from '../biometric/zk-service';
import { query } from '../db/postgres';

let isSyncing = false;

export function initSyncWorker() {
  const deviceIp = process.env.ZKTECO_DEVICE_IP;
  if (!deviceIp) {
    console.warn('⚠️ ZKTECO_DEVICE_IP not set. Biometric sync worker disabled.');
    return;
  }

  // Sync every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    if (isSyncing) return;
    
    try {
      isSyncing = true;
      console.log('🕒 Starting scheduled biometric sync for all devices...');
      
      // Get all active devices from all tenants
      const devicesRes = await query('SELECT tenant_id, device_ip FROM tenant_devices WHERE status = \'active\'');
      const devices = devicesRes.rows;

      if (devices.length === 0) {
        // Fallback to env variable if no devices in DB (legacy support)
        const envIp = process.env.ZKTECO_DEVICE_IP;
        if (envIp) {
            const tenantRes = await query('SELECT id FROM tenants LIMIT 1');
            const tenantId = tenantRes.rows[0]?.id;
            if (tenantId) {
                console.log(`📡 Syncing fallback device ${envIp}...`);
                const zkService = new ZKService(envIp);
                await zkService.syncLogs(tenantId);
            }
        } else {
            console.warn('⚠️ No active biometric devices found.');
        }
        return;
      }

      for (const device of devices) {
        try {
          console.log(`📡 Syncing device at ${device.device_ip}...`);
          const zkService = new ZKService(device.device_ip);
          await zkService.syncLogs(device.tenant_id);
        } catch (err) {
          console.error(`❌ Sync failed for device ${device.device_ip}:`, err);
        }
      }

      console.log('✅ All scheduled biometric syncs completed.');
    } catch (error) {
      console.error('❌ Scheduled biometric sync failed:', error);
    } finally {
      isSyncing = false;
    }
  });

  console.log('🚀 Biometric Sync Worker initialized (every 30m)');
}
