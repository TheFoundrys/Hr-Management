'use server';

import { generateQrToken } from '@/lib/utils/qr';
import { verifyToken, getTokenFromCookies } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

export async function getMyQrToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) return { error: 'Unauthorized' };

  const payload = await verifyToken(token);
  if (!payload || !payload.employeeId) return { error: 'Invalid user session' };

  const qrToken = generateQrToken(payload.employeeId, payload.tenantId);
  return { success: true, token: qrToken };
}
