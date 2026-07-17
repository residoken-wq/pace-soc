import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateToken } from '@/lib/token';

const PUBLIC_ROUTES = [
    '/login',
    '/api/auth/login',
    '/_next',
    '/favicon.ico',
];

const ADMIN_ONLY_PREFIXES = [
    '/api/debug',
    '/api/system/fix',
    '/api/logs/cleanup',
    '/api/email/test',
];

function isPublicRoute(pathname: string): boolean {
    return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

function isAdminOnly(request: NextRequest): boolean {
    const { pathname } = request.nextUrl;
    if (ADMIN_ONLY_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))) return true;
    if (['/api/settings', '/api/rules'].includes(pathname)) return true;
    if (request.method !== 'GET' && pathname === '/api/wazuh/agents') return true;
    return false;
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (isPublicRoute(pathname)) return NextResponse.next();

    const user = validateToken(request.cookies.get('soc_auth')?.value || '');
    if (!user) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (isAdminOnly(request) && user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const response = NextResponse.next();
    response.headers.set('X-Authenticated-User', user.username);
    response.headers.set('X-Authenticated-Role', user.role);
    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
