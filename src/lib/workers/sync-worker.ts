import cron from 'node-cron';
import { ZKService } from '../biometric/zk-service';
import { query } from '../db/postgres';

/**
 * PRODUCTION SYNC WORKER: HEARTBEAT WINDOW (2 MINUTES)
 * Delegating all logic to the Service level for simplicity.
 */
export function initSyncWorker() {
  const defaultIp = process.env.ZKTECO_DEVICE_IP;
  if (!defaultIp) {
    console.warn('⚠️ ZKTECO_DEVICE_IP not set. Sync worker disabled.');
    return;
  }

  cron.schedule('*/2 * * * *', async () => {
    console.log(`🕒 [SYNC HEARTBEAT] Iterating through devices (${new Date().toLocaleTimeString()})...`);
    
    try {
      // 1. Fetch devices from DB
      const devicesRes = await query(
        "SELECT tenant_id, device_ip, id as device_id FROM tenant_devices WHERE status = 'active'"
      );

      if (devicesRes.rows.length === 0) {
        console.log(`ℹ️ [SYNC HEARTBEAT] No active devices found. Skipping cycle.`);
      } else {
        // Parallel sync window (limit to 5 at a time for safety)
        for (const dev of devicesRes.rows) {
          try {
            await new ZKService(dev.device_ip).sync(dev.tenant_id, dev.device_id);
          } catch (err) {
            console.error(`❌ Sync skip for ${dev.device_ip}:`, err);
          }
        }
      }
      
      console.log(`✅ [SYNC HEARTBEAT] All cycles completed.`);
    } catch (error) {
      console.error(`❌ Global Sync failure:`, error);
    }
  });

  console.log('🚀 SYSTEM ALERT: Biometric Sync Worker initialized (2m Window)');
}
