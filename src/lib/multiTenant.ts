import { query } from './db/postgres';
import { v4 as uuidv4 } from 'uuid';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  domain: string;
  database: string;
  settings: any;
  createdAt: Date;
  updatedAt: Date;
}

class TenantManager {
  async createTenant(data: {
    name: string;
    subdomain: string;
    domain: string;
    database: string;
    settings: any;
  }): Promise<Tenant> {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO tenants (id, name, subdomain, domain, database_name, settings)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, data.name, data.subdomain, data.domain, data.database, JSON.stringify(data.settings)]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      subdomain: row.subdomain,
      domain: row.domain,
      database: row.database_name,
      settings: row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getAllTenants(): Promise<Tenant[]> {
    const result = await query('SELECT * FROM tenants ORDER BY created_at DESC');
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      subdomain: row.subdomain,
      domain: row.domain,
      database: row.database_name,
      settings: row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
    const result = await query('SELECT * FROM tenants WHERE subdomain = $1', [subdomain]);
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      subdomain: row.subdomain,
      domain: row.domain,
      database: row.database_name,
      settings: row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const globalTenantManager = new TenantManager();
