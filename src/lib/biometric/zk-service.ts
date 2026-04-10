import ZKLib from 'node-zklib';
import { batchInsertLogs, processAttendance } from '../attendance/engine';

export class ZKService {
  private zkInstance: any;
  private ip: string;
  private port: number;
  private timeout: number;

  constructor(ip: string, port: number = 4370, timeout: number = 10000) {
    this.ip = ip;
    this.port = port;
    this.timeout = timeout;
    this.zkInstance = new ZKLib(this.ip, this.port, this.timeout, 4000);
  }

  /**
   * HIGH-LEVEL SYNC ORCHESTRATION: "BORINGLY SIMPLE"
   * Connects, fetches, saves, processes.
   */
  async sync(tenantId: string, deviceId: string = 'IP-DEVICE') {
    let connected = false;
    try {
      // 1. Connection with 1 retry
      try {
        await this.zkInstance.createSocket();
        connected = true;
      } catch (err) {
        console.warn(`[ZK] Sync retry for ${this.ip}...`);
        await new Promise(res => setTimeout(res, 2000));
        await this.zkInstance.createSocket();
        connected = true;
      }

      // 2. Data Transfer
      console.log(`[ZK] Syncing logs from ${this.ip}...`);
      const logs = await this.zkInstance.getAttendances();
      const logsData = logs.data || [];

      // 3. Store and Process
      const count = await batchInsertLogs(logsData, tenantId, deviceId);
      
      const today = new Date().toISOString().split('T')[0];
      const processing = await processAttendance(tenantId, today);

      return { success: true, count, processing };

    } catch (error) {
      console.error(`[ZK] Sync failure at ${this.ip}:`, error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      if (connected) {
        try { await this.zkInstance.disconnect(); } catch (e) {}
      }
    }
  }

  /**
   * Raw log fetch (optional low-level call)
   */
  async fetchLogs() {
    let connected = false;
    try {
      await this.zkInstance.createSocket();
      connected = true;
      const logs = await this.zkInstance.getAttendances();
      return logs.data || [];
    } finally {
      if (connected) try { await this.zkInstance.disconnect(); } catch (e) {}
    }
  }
}
