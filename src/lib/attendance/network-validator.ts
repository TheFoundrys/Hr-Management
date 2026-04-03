import { query } from '@/lib/db/postgres';

export interface NetworkPolicy {
  id: string;
  tenant_id: string;
  ip_address_or_range: string;
  label: string;
  is_active: boolean;
}

/**
 * Converts an IPv4 string to a 32-bit unsigned integer.
 */
function ipToLong(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return 0;
  return ((+parts[0] << 24) | (+parts[1] << 16) | (+parts[2] << 8) | +parts[3]) >>> 0;
}

/**
 * Checks if a given IP matches an IP address or CIDR range.
 */
export function isIpAllowed(clientIp: string, allowedRange: string): boolean {
  // Direct match
  if (clientIp === allowedRange) return true;

  // CIDR check
  if (allowedRange.includes('/')) {
    const [rangeIp, prefixStr] = allowedRange.split('/');
    const prefix = parseInt(prefixStr, 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const clientLong = ipToLong(clientIp);
    const rangeLong = ipToLong(rangeIp);

    return (clientLong & mask) === (rangeLong & mask);
  }

  return false;
}

/**
 * Validates a request IP against the network policies of a tenant.
 */
export async function validateNetworkAccess(tenantId: string, clientIp: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  try {
    // 1. Fetch tenant settings to check if IP validation is enabled
    const tenantResult = await query('SELECT settings FROM tenants WHERE id = $1', [tenantId]);
    const tenant = tenantResult.rows[0];

    if (!tenant) return { allowed: false, reason: 'Tenant not found' };

    const settings = tenant.settings || {};
    const isIpValidationEnabled = settings.enable_ip_validation === true;

    // 2. If validation is disabled, allow all
    if (!isIpValidationEnabled) return { allowed: true };

    // 3. Fetch active network policies for the tenant
    const policiesResult = await query(
      'SELECT ip_address_or_range FROM attendance_network_policies WHERE tenant_id = $1 AND is_active = true',
      [tenantId]
    );

    const policies = policiesResult.rows;

    // 4. If validation is enabled but no policies exist, it's safer to block (or allow, but usually block)
    // The user requirement says "If IP validation is enabled... attendance should only be marked if the request originates from an allowed IP"
    if (policies.length === 0) {
      return { allowed: false, reason: 'IP validation enabled but no network policies defined. Restricted access.' };
    }

    // 5. Check if client IP matches any allowed range
    const isMatched = policies.some(p => isIpAllowed(clientIp, p.ip_address_or_range));

    if (isMatched) {
      return { allowed: true };
    }

    return { allowed: false, reason: `Attendance restricted to authorized network locations. Your IP: ${clientIp}` };
  } catch (error) {
    console.error('Network validation error:', error);
    // On error, we fail secure: block the request
    return { allowed: false, reason: 'Internal security validation error' };
  }
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(headers: Headers): string {
  // Standard headers for proxied environments
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) return xRealIp;

  // Final fallback
  return '127.0.0.1';
}
