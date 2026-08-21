import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateToken } from '@/lib/token';
import { canAccess, isPublicRoute } from '@/lib/access-policy';
import { REQUEST_ID_HEADER, resolveRequestId } from '@/lib/request-context';

function nextWithRequestContext(request: NextRequest, requestId: string, user?: { username: string; role: string }) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(REQUEST_ID_HEADER, requestId);
    if (user) {
        requestHeaders.set('X-Authenticated-User', user.username);
        requestHeaders.set('X-Authenticated-Role', user.role);
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
    if (isPublicRoute(pathname)) return nextWithRequestContext(request, requestId);

    const user = validateToken(request.cookies.get('soc_auth')?.value || '');
    if (!user) {
        if (pathname.startsWith('/api/')) {
            const response = NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 });
            response.headers.set(REQUEST_ID_HEADER, requestId);
            return response;
        }
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        const response = NextResponse.redirect(loginUrl);
        response.headers.set(REQUEST_ID_HEADER, requestId);
        return response;
    }

    if (!canAccess(user.role, pathname, request.method)) {
        const response = NextResponse.json({ error: 'Forbidden', requestId }, { status: 403 });
        response.headers.set(REQUEST_ID_HEADER, requestId);
        return response;
    }

    return nextWithRequestContext(request, requestId, user);
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
