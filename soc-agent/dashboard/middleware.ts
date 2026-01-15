// Next.js Middleware for Authentication
// Protects all routes except login and public assets

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
    '/login',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/debug',        // Debug endpoints for testing
    '/api/alerts/stream', // SSE streaming endpoint
    '/_next',
    '/favicon.ico',
];

// Check if route is public
function isPublicRoute(pathname: string): boolean {
    return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

// Simple token validation (mirror of lib/auth.ts logic)
function validateTokenSimple(token: string): boolean {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;

        const payloadStr = parts[1];
        const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString());

        // Check expiry
        if (payload.exp < Date.now()) return false;

        return true;
    } catch {
        return false;
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip public routes
    if (isPublicRoute(pathname)) {
        return NextResponse.next();
    }

    // Check for auth token in cookie
    const token = request.cookies.get('soc_auth')?.value;

    if (!token || !validateTokenSimple(token)) {
        // For API routes, return 401
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Please login to access this resource' },
                { status: 401 }
            );
        }

        // For pages, redirect to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Add CORS headers for API routes
    if (pathname.startsWith('/api/')) {
        const response = NextResponse.next();

        const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://soc.pace.edu.vn';
        const origin = request.headers.get('origin');

        // Only allow configured origin
        if (origin === allowedOrigin || origin === 'http://localhost:3000') {
            response.headers.set('Access-Control-Allow-Origin', origin);
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            response.headers.set('Access-Control-Allow-Credentials', 'true');
        }

        return response;
    }

    return NextResponse.next();
}

// Configure which routes this middleware applies to
export const config = {
    matcher: [
        // Match all paths except static files
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
