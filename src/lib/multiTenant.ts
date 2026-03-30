import { query } from './db';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  subdomain: string;
  database: string;
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  timezone: string;
  workingHours: {
    start: string;
    end: string;
  };
  attendanceRules: {
    gracePeriod: number; // minutes
    overtimeThreshold: number; // hours
  };
  deviceTypes: string[]; // ZKTeco, Anviz, Realtime, etc.
}

export interface TenantDevice {
  id: string;
  tenantId: string;
  deviceId: string;
  deviceType: string;
  deviceIp: string;
  deviceName: string;
  location: string;
  status: 'active' | 'inactive' | 'maintenance';
  settings: DeviceSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceSettings {
  syncInterval: number; // seconds
  autoSync: boolean;
  timezone: string;
  port: number;
  protocol: 'http' | 'tcp' | 'udp';
}

export interface TenantUser {
  id: string;
  tenantId: string;
  userId: string;
  deviceId: string;
  deviceUserId: string; // Device-specific user ID
  role: string;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class MultiTenantManager {
  private currentTenant: Tenant | null = null;
  private tenantCache: Map<string, Tenant> = new Map();

  // Initialize tenant from request
  async initializeTenant(request: Request): Promise<Tenant> {
    const hostname = request.headers.get('host') || '';
    const subdomain = hostname.split('.')[0];

    // Check cache first
    if (this.tenantCache.has(subdomain)) {
      this.currentTenant = this.tenantCache.get(subdomain)!;
      return this.currentTenant;
    }

    // Get tenant from database
    const result = await query(
      `SELECT * FROM "Tenant" WHERE "subdomain" = $1 OR "domain" = $1 LIMIT 1`,
      [subdomain]
    );

    if (result.rowCount === 0) {
      throw new Error(`Tenant ${subdomain} not found`);
    }

    const tenant = result.rows[0];
    this.tenantCache.set(subdomain, tenant);
    this.currentTenant = tenant;

    console.log(`🏢 Initialized tenant: ${tenant.name} (${tenant.subdomain})`);
    return tenant;
  }

  // Get current tenant
  getCurrentTenant(): Tenant | null {
    return this.currentTenant;
  }

  // Get tenant devices
  async getTenantDevices(tenantId: string): Promise<TenantDevice[]> {
    // Check if tenantId is UUID or subdomain
    const isUuid = tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    const whereClause = isUuid ? `WHERE "tenantId" = $1` : `WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE subdomain = $1 LIMIT 1)`;

    const result = await query(
      `SELECT * FROM "TenantDevice" ${whereClause} AND status = 'active'`,
      [tenantId]
    );

    return result.rows;
  }

  // Get device by ID for current tenant
  async getDevice(deviceId: string): Promise<TenantDevice | null> {
    if (!this.currentTenant) {
      throw new Error('No tenant initialized');
    }

    const result = await query(
      `SELECT * FROM "TenantDevice"
       WHERE "tenantId" = $1 AND "deviceId" = $2 AND status = 'active' LIMIT 1`,
      [this.currentTenant.id, deviceId]
    );

    return result.rows[0] || null;
  }

  // Get user mapping for device
  async getUserMapping(tenantId: string, deviceId: string, deviceUserId: string): Promise<TenantUser | null> {
    // Check if tenantId is UUID or subdomain
    const isUuid = tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    const whereClause = isUuid ?
      `WHERE "tenantId" = $1 AND "deviceId" = $2 AND "deviceUserId" = $3 AND "isActive" = true LIMIT 1` :
      `WHERE "tenantId" = (SELECT id FROM "Tenant" WHERE subdomain = $1 LIMIT 1) AND "deviceId" = $2 AND "deviceUserId" = $3 AND "isActive" = true LIMIT 1`;

    const result = await query(
      `SELECT * FROM "TenantUser" ${whereClause}`,
      [tenantId, deviceId, deviceUserId]
    );

    return result.rows[0] || null;
  }

  // Create new tenant
  async createTenant(tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const result = await query(
      `INSERT INTO "Tenant"
       (name, domain, subdomain, database, settings, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        tenantData.name,
        tenantData.domain,
        tenantData.subdomain,
        tenantData.database,
        JSON.stringify(tenantData.settings),
        new Date(),
        new Date()
      ]
    );

    const tenant = result.rows[0];
    this.tenantCache.set(tenant.subdomain, tenant);

    console.log(`✅ Created tenant: ${tenant.name} (${tenant.subdomain})`);
    return tenant;
  }

  // Add device to tenant
  async addDevice(tenantId: string, deviceData: Omit<TenantDevice, 'id' | 'createdAt' | 'updatedAt'>): Promise<TenantDevice> {
    // Convert subdomain to UUID if needed
    let actualTenantId = tenantId;
    const isUuid = tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    if (!isUuid) {
      const tenantResult = await query(
        `SELECT id FROM "Tenant" WHERE subdomain = $1 LIMIT 1`,
        [tenantId]
      );
      if (tenantResult?.rowCount && tenantResult.rowCount > 0) {
        actualTenantId = tenantResult.rows[0].id;
      }
    }

    const result = await query(
      `INSERT INTO "TenantDevice"
       ("tenantId", "deviceId", "deviceType", "deviceIp", "deviceName", "location", status, settings, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        actualTenantId,
        deviceData.deviceId,
        deviceData.deviceType,
        deviceData.deviceIp,
        deviceData.deviceName,
        deviceData.location,
        deviceData.status || 'active',
        JSON.stringify(deviceData.settings),
        new Date(),
        new Date()
      ]
    );

    const device = result.rows[0];
    console.log(`📱 Added device to tenant: ${device.deviceName} (${device.deviceIp})`);
    return device;
  }

  // Map user to device
  async mapUserToDevice(tenantId: string, mappingData: Omit<TenantUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<TenantUser> {
    const result = await query(
      `INSERT INTO "TenantUser"
       ("tenantId", "userId", "deviceId", "deviceUserId", "role", "permissions", "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT ("tenantId", "deviceId", "deviceUserId")
       DO UPDATE SET
         "userId" = EXCLUDED."userId",
         "role" = EXCLUDED."role",
         "permissions" = EXCLUDED."permissions",
         "isActive" = EXCLUDED."isActive",
         "updatedAt" = EXCLUDED."updatedAt"
       RETURNING *`,
      [
        tenantId,
        mappingData.userId,
        mappingData.deviceId,
        mappingData.deviceUserId,
        mappingData.role,
        JSON.stringify(mappingData.permissions),
        mappingData.isActive,
        new Date(),
        new Date()
      ]
    );

    const mapping = result.rows[0];
    console.log(`🔗 Mapped user: ${mapping.userId} -> device ${mapping.deviceId} (${mapping.deviceUserId})`);
    return mapping;
  }

  // Get all tenants (for admin)
  async getAllTenants(): Promise<Tenant[]> {
    const result = await query(
      `SELECT * FROM "Tenant" ORDER BY "createdAt" DESC`
    );

    return result.rows;
  }

  // Clear tenant cache
  clearCache(): void {
    this.tenantCache.clear();
    this.currentTenant = null;
  }
}

// Global tenant manager instance
export const tenantManager = new MultiTenantManager();
