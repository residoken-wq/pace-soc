import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createToken, validateCredentials } from '../../../../lib/auth';
import { isJwtConfigured } from '../../../../lib/token';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
    try {
        if (!isJwtConfigured()) {
            console.error('[AUTH] JWT_SECRET is missing or shorter than 32 characters');
            return NextResponse.json({ success: false, error: 'Authentication is not configured' }, { status: 503 });
        }
        const sourceIp = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        const now = Date.now();
        const current = attempts.get(sourceIp);
        if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
            return NextResponse.json({ success: false, error: 'Too many login attempts. Try again later.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((current.resetAt - now) / 1000)) } });
        }
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({
                success: false,
                error: 'Username and password are required'
            }, { status: 400 });
        }

        const validation = validateCredentials(username, password);

        if (!validation.valid) {
            const next = current && current.resetAt > now ? { count: current.count + 1, resetAt: current.resetAt } : { count: 1, resetAt: now + WINDOW_MS };
            attempts.set(sourceIp, next);
            // Log failed attempt (security audit)
            console.warn(`[AUTH] Failed login attempt for user: ${username} from IP: ${request.headers.get('x-forwarded-for') || 'unknown'}`);

            return NextResponse.json({
                success: false,
                error: 'Invalid username or password'
            }, { status: 401 });
        }

        attempts.delete(sourceIp);

        // Generate JWT token
        const token = createToken(username, validation.role!, validation.name!);

        // Set secure cookie
        const cookieStore = await cookies();
        cookieStore.set('soc_auth', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60, // 1 hour
            path: '/'
        });

        console.log(`[AUTH] Successful login for user: ${username}`);

        return NextResponse.json({
            success: true,
            user: {
                username,
                name: validation.name,
                role: validation.role
            }
        });

    } catch (error: any) {
        console.error('[AUTH] Login error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}
