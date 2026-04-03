import { SignJWT, jwtVerify, JWTPayload } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-change-in-production');

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  role: 'STAFF' | 'HOD' | 'HR' | 'ADMIN' | string;
  tenantId: string;

}

export async function createToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  return cookies['auth-token'] || null;
}
