import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { getRequiredPermissionForPath, hasPermission } from '@/lib/auth/rbac';

const publicPaths = [
  '/login', '/register', '/forgot-password', '/reset-password',
  '/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', 
  '/api/auth/reset-password', '/api/auth/verify', '/api/verify',
  '/api/biometric/push', '/api/attendance/ingest'
];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  // Allow static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname === '/') {
    return NextResponse.next();
  }

  // Redirect away from login if already authenticated
  if (pathname === '/login' && token) {
    const payload = await verifyToken(token);
    if (payload) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Verify JWT
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Advanced RBAC Check
  const requiredPermission = getRequiredPermissionForPath(pathname);
  if (requiredPermission && !hasPermission(payload.role, requiredPermission)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: `Forbidden: Requires ${requiredPermission} permission` }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Attach user info to headers for downstream components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-tenant-id', payload.tenantId);
  requestHeaders.set('x-user-name', (payload as any).name || '');

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
};
