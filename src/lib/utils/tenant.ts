import { query } from '../db/postgres';

export async function getTenantId(request: Request): Promise<string> {
  const headerTenantId = request.headers.get('x-tenant-id');
  
  // If a valid UUID is provided in headers, use it
  if (headerTenantId && headerTenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
    return headerTenantId;
  }

  // Fallback: Get the first tenant from the database
  const result = await query('SELECT id FROM tenants LIMIT 1');
  if (result.rows.length > 0) {
    return result.rows[0].id;
  }

  return 'default';
}
