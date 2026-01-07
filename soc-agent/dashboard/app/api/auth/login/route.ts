import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createToken, validateCredentials } from '../../../../lib/auth';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({
                success: false,
                error: 'Username and password are required'
            }, { status: 400 });
        }

        const validation = validateCredentials(username, password);

        if (!validation.valid) {
            // Log failed attempt (security audit)
            console.warn(`[AUTH] Failed login attempt for user: ${username} from IP: ${request.headers.get('x-forwarded-for') || 'unknown'}`);

            return NextResponse.json({
                success: false,
                error: 'Invalid username or password'
            }, { status: 401 });
        }

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
