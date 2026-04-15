import { query } from './db/postgres';

export interface UniversalDeviceLog {
  deviceId: string;
  deviceUserId: string;
  timestamp: Date;
  type: 'check-in' | 'check-out' | 'break-in' | 'break-out';
  deviceName: string;
  verifyType: string; // fingerprint, face, card, password
  additionalData?: Record<string, any>;
}

export interface DeviceAdapter {
  deviceType: string;
  connect(device: any): Promise<boolean>;
  fetchUsers(device: any): Promise<any[]>;
  fetchLogs(device: any): Promise<UniversalDeviceLog[]>;
  disconnect(device: any): Promise<void>;
}

export class ZKTecoAdapter implements DeviceAdapter {
  deviceType = 'ZKTeco';

  async connect(device: any): Promise<boolean> {
    console.log(`🔌 Connecting to ZKTeco device: ${device.deviceIp}`);
    // Simulate ZKTeco connection
    return true;
  }

  async fetchUsers(device: any): Promise<any[]> {
    console.log(`👥 Fetching users from ZKTeco device: ${device.deviceIp}`);
    // Simulate ZKTeco user fetch
    return [
      { userId: 1, name: "Admin User", role: 0 },
      { userId: 2, name: "Raju kalla", role: 2 },
      { userId: 3, name: "John Doe", role: 2 },
      { userId: 4, name: "Jane Smith", role: 2 }
    ];
  }

  async fetchLogs(device: any): Promise<UniversalDeviceLog[]> {
    console.log(`📊 Fetching logs from ZKTeco device: ${device.deviceIp}`);
    // Simulate ZKTeco log fetch
    return [
      { deviceId: device.deviceId, deviceUserId: "2", timestamp: new Date(), type: "check-in", deviceName: device.deviceName, verifyType: "fingerprint" },
      { deviceId: device.deviceId, deviceUserId: "3", timestamp: new Date(Date.now() - 3600000), type: "check-out", deviceName: device.deviceName, verifyType: "face" }
    ];
  }

  async disconnect(device: any): Promise<void> {
    console.log(`🔌 Disconnecting from ZKTeco device: ${device.deviceIp}`);
  }
}

export class AnvizAdapter implements DeviceAdapter {
  deviceType = 'Anviz';

  async connect(device: any): Promise<boolean> {
    console.log(`🔌 Connecting to Anviz device: ${device.deviceIp}`);
    return true;
  }

  async fetchUsers(device: any): Promise<any[]> {
    console.log(`👥 Fetching users from Anviz device: ${device.deviceIp}`);
    return [
      { emp_id: "E001", name: "Alice", role: "user" },
      { emp_id: "E002", name: "Bob", role: "user" }
    ];
  }

  async fetchLogs(device: any): Promise<UniversalDeviceLog[]> {
    console.log(`📊 Fetching logs from Anviz device: ${device.deviceIp}`);
    return [
      { deviceId: device.deviceId, deviceUserId: "E001", timestamp: new Date(), type: "check-in", deviceName: device.deviceName, verifyType: "card" }
    ];
  }

  async disconnect(device: any): Promise<void> {
    console.log(`🔌 Disconnecting from Anviz device: ${device.deviceIp}`);
  }
}

export class UniversalDeviceManager {
  private adapters: Map<string, DeviceAdapter> = new Map();
  private activeConnections: Map<string, DeviceAdapter> = new Map();

  constructor() {
    // Register adapters
    this.adapters.set('ZKTeco', new ZKTecoAdapter());
    this.adapters.set('Anviz', new AnvizAdapter());
    // Add more adapters as needed
  }

  // Get adapter for device type
  getAdapter(deviceType: string): DeviceAdapter | undefined {
    return this.adapters.get(deviceType);
  }

  // Connect to device
  async connectDevice(device: any): Promise<boolean> {
    const adapter = this.getAdapter(device.deviceType);
    if (!adapter) {
      throw new Error(`No adapter found for device type: ${device.deviceType}`);
    }

    const connected = await adapter.connect(device);
    if (connected) {
      this.activeConnections.set(device.deviceId, adapter);
    }
    return connected;
  }

  // Disconnect from device
  async disconnectDevice(device: any): Promise<void> {
    const adapter = this.activeConnections.get(device.deviceId);
    if (adapter) {
      await adapter.disconnect(device);
      this.activeConnections.delete(device.deviceId);
    }
  }

  // Fetch logs from device
  async fetchLogs(device: any): Promise<UniversalDeviceLog[]> {
    const adapter = this.activeConnections.get(device.deviceId);
    if (!adapter) {
      throw new Error(`Device ${device.deviceId} is not connected`);
    }

    return await adapter.fetchLogs(device);
  }

  // Process logs and store in database
  async processLogs(tenantId: string, logs: UniversalDeviceLog[]): Promise<void> {
    let processedCount = 0;

    for (const log of logs) {
      try {
        // Get user mapping for this tenant and device
        const userMapping = await this.getUserMapping(tenantId, log.deviceId, log.deviceUserId);

        if (!userMapping) {
          console.log(`⚠️ No mapping found for device user ${log.deviceUserId} on device ${log.deviceId}`);
          continue;
        }

        // Store attendance record
        await this.storeAttendanceRecord(userMapping.userId, log);
        console.log(`✅ Processed attendance for user ${userMapping.userId} from device ${log.deviceId}`);
        processedCount++;

      } catch (error) {
        console.error(`❌ Failed to process log for device user ${log.deviceUserId}:`, error);
      }
    }

    console.log(`🎯 Processed ${processedCount} attendance records for tenant ${tenantId}`);
  }

  // Store attendance record in database
  private async storeAttendanceRecord(userId: string, log: UniversalDeviceLog): Promise<void> {
    const isCheckIn = log.type === 'check-in' || log.type === 'break-in';
    const status = isCheckIn ?
      (log.timestamp.getHours() >= 9 ? 'LATE' : 'PRESENT') :
      'PRESENT';

    // Check if record already exists for this date
    const existingRecord = await query(
      `SELECT id FROM attendance
       WHERE employee_id = (SELECT id FROM employees WHERE user_id = $1 LIMIT 1)
       AND DATE(date) = DATE($2)`,
      [userId, log.timestamp]
    );

    if (existingRecord && existingRecord.rows.length > 0) {
      // Update existing record
      await query(
        `UPDATE attendance
         SET check_out = $3, status = $4, updated_at = NOW()
         WHERE employee_id = (SELECT id FROM employees WHERE user_id = $1 LIMIT 1)
         AND DATE(date) = DATE($2)`,
        [userId, log.timestamp, isCheckIn ? null : log.timestamp, status]
      );
    } else {
      // Create new record
      await query(
        `INSERT INTO attendance
         (employee_id, device_id, check_in, check_out, status, date)
         VALUES ((SELECT id FROM employees WHERE user_id = $1 LIMIT 1), $2, $3, $4, $5, $6)`,
        [
          userId,
          log.deviceId,
          isCheckIn ? log.timestamp : null,
          !isCheckIn ? log.timestamp : null,
          status,
          log.timestamp
        ]
      );
    }
  }

  // Get user mapping (simplified version)
  private async getUserMapping(tenantId: string, deviceId: string, deviceUserId: string): Promise<any | null> {
    const result = await query(
      `SELECT * FROM tenant_users
       WHERE tenant_id = (SELECT id FROM tenants WHERE subdomain = $1 OR id::text = $1 LIMIT 1)
       AND device_id = $2 AND device_user_id = $3 AND is_active = true LIMIT 1`,
      [tenantId, deviceId, deviceUserId]
    );

    return result.rows[0] || null;
  }

  // Start real-time monitoring for all tenant devices
  async startTenantMonitoring(tenantId: string): Promise<void> {
    const devices = await this.getTenantDevices(tenantId);

    console.log(`🚀 Starting monitoring for ${devices.length} devices in tenant ${tenantId}`);

    for (const device of devices) {
      try {
        await this.connectDevice(device);
      } catch (error) {
        console.error(`❌ Failed to connect to device ${device.device_id}:`, error);
      }
    }

    // Start monitoring loop
    setInterval(async () => {
      for (const device of devices) {
        try {
          const logs = await this.fetchLogs(device);
          await this.processLogs(tenantId, logs);
        } catch (error) {
          console.error(`❌ Failed to fetch logs from device ${device.device_id}:`, error);
        }
      }
    }, 30000); // 30 seconds
  }

  // Get tenant devices (simplified)
  private async getTenantDevices(tenantId: string): Promise<any[]> {
    const result = await query(
      `SELECT * FROM tenant_devices
       WHERE tenant_id = (SELECT id FROM tenants WHERE subdomain = $1 OR id::text = $1 LIMIT 1)
       AND status = 'active'`,
      [tenantId]
    );

    return result.rows;
  }

  // Get device status for tenant
  async getTenantDeviceStatus(tenantId: string): Promise<any[]> {
    const devices = await this.getTenantDevices(tenantId);

    return devices.map(device => ({
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      deviceIp: device.deviceIp,
      location: device.location,
      status: this.activeConnections.has(device.deviceId) ? 'online' : 'offline',
      lastSync: new Date(),
      settings: device.settings
    }));
  }
}

// Global device manager instance
export const deviceManager = new UniversalDeviceManager();
