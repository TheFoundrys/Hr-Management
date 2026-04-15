import { cookies } from 'next/headers';
import { verifyToken } from '../auth/jwt';
import { query } from '../db/postgres';

export async function getTenantId(request?: Request): Promise<string> {
  // 1. Check Session/JWT (Highest Priority)
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (token) {
    const payload = await verifyToken(token);
    if (payload?.tenantId) {
      return payload.tenantId;
    }
  }

  // 2. Header fallback (for internal tools/debugging)
  const headerTenantId = request?.headers.get('x-tenant-id');
  if (headerTenantId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(headerTenantId)) {
    return headerTenantId;
  }

  throw new Error('Unauthorized: Tenant context could not be determined');
}
