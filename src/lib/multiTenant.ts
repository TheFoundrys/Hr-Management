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
    const host = request.headers.get('host') || '';
    const hostname = host.split(':')[0];
    const subdomain = hostname.split('.')[0] || 'default';

    // Check cache first
    if (this.tenantCache.has(subdomain)) {
      this.currentTenant = this.tenantCache.get(subdomain)!;
      return this.currentTenant;
    }

    // Get tenant from database
    const result = await query(
      `SELECT * FROM tenants WHERE subdomain = $1 OR domain = $1 LIMIT 1`,
      [subdomain]
    );

    if (result.rows.length === 0) {
      // Try to find a default tenant if subdomain is localhost or common
      if (subdomain === 'localhost' || subdomain === 'default') {
        const defaultRes = await query('SELECT * FROM tenants LIMIT 1');
        if (defaultRes && defaultRes.rows.length > 0) {
          const tenant = defaultRes.rows[0];
          this.tenantCache.set(subdomain, tenant);
          this.currentTenant = tenant;
          return tenant;
        }
      }
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
    const isUuid = tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    const whereClause = isUuid ? `WHERE tenant_id = $1` : `WHERE tenant_id = (SELECT id FROM tenants WHERE subdomain = $1 LIMIT 1)`;

    const result = await query(
      `SELECT * FROM tenant_devices ${whereClause} AND status = 'active'`,
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
      `SELECT * FROM tenant_devices
       WHERE tenant_id = $1 AND device_id = $2 AND status = 'active' LIMIT 1`,
      [this.currentTenant.id, deviceId]
    );

    return result.rows[0] || null;
  }

  // Get user mapping for device
  async getUserMapping(tenantId: string, deviceId: string, deviceUserId: string): Promise<TenantUser | null> {
    const isUuid = tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    const whereClause = isUuid ?
      `WHERE tenant_id = $1 AND device_id = $2 AND device_user_id = $3 AND is_active = true LIMIT 1` :
      `WHERE tenant_id = (SELECT id FROM tenants WHERE subdomain = $1 LIMIT 1) AND device_id = $2 AND device_user_id = $3 AND is_active = true LIMIT 1`;

    const result = await query(
      `SELECT * FROM tenant_users ${whereClause}`,
      [tenantId, deviceId, deviceUserId]
    );

    return result.rows[0] || null;
  }

  // Create new tenant
  async createTenant(tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const result = await query(
      `INSERT INTO tenants
       (name, domain, subdomain, database_name, settings)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        tenantData.name,
        tenantData.domain,
        tenantData.subdomain,
        tenantData.database,
        JSON.stringify(tenantData.settings)
      ]
    );

    const tenant = result.rows[0];
    this.tenantCache.set(tenant.subdomain, tenant);

    console.log(`✅ Created tenant: ${tenant.name} (${tenant.subdomain})`);
    return tenant;
  }

  // Add device to tenant
  async addDevice(tenantId: string, deviceData: Omit<TenantDevice, 'id' | 'createdAt' | 'updatedAt'>): Promise<TenantDevice> {
    let actualTenantId = tenantId;
    const isUuid = tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    if (!isUuid) {
      const tenantResult = await query(
        `SELECT id FROM tenants WHERE subdomain = $1 LIMIT 1`,
        [tenantId]
      );
      if (tenantResult?.rows.length && tenantResult.rows.length > 0) {
        actualTenantId = tenantResult.rows[0].id;
      }
    }

    const result = await query(
      `INSERT INTO tenant_devices
       (tenant_id, device_id, device_type, device_ip, device_name, location, status, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        actualTenantId,
        deviceData.deviceId,
        deviceData.deviceType,
        deviceData.deviceIp,
        deviceData.deviceName,
        deviceData.location,
        deviceData.status || 'active',
        JSON.stringify(deviceData.settings)
      ]
    );

    const device = result.rows[0];
    console.log(`📱 Added device to tenant: ${device.device_name} (${device.device_ip})`);
    return device;
  }

  // Map user to device
  async mapUserToDevice(tenantId: string, mappingData: Omit<TenantUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<TenantUser> {
    const result = await query(
      `INSERT INTO tenant_users
       (tenant_id, user_id, device_id, device_user_id, role, permissions, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, device_id, device_user_id)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         role = EXCLUDED.role,
         permissions = EXCLUDED.permissions,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING *`,
      [
        tenantId,
        mappingData.userId,
        mappingData.deviceId,
        mappingData.deviceUserId,
        mappingData.role,
        JSON.stringify(mappingData.permissions),
        mappingData.isActive
      ]
    );

    const mapping = result.rows[0];
    console.log(`🔗 Mapped user: ${mapping.user_id} -> device ${mapping.device_id} (${mapping.device_user_id})`);
    return mapping;
  }

  // Get all tenants (for admin)
  async getAllTenants(): Promise<Tenant[]> {
    const result = await query(
      `SELECT * FROM tenants ORDER BY created_at DESC`
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
export const globalTenantManager = new MultiTenantManager();
