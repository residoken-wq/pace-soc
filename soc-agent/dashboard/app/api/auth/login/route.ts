import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Simple users database - in production, use a real database
const USERS = [
    { id: 1, username: 'admin', password: 'admin', role: 'admin', name: 'Administrator' },
    { id: 2, username: 'analyst', password: 'analyst', role: 'analyst', name: 'SOC Analyst' },
    { id: 3, username: 'viewer', password: 'viewer', role: 'viewer', name: 'Viewer' }
];

// Simple token generation - in production, use JWT
function generateToken(userId: number): string {
    const payload = {
        userId,
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        random: Math.random().toString(36).substring(7)
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        const user = USERS.find(u => u.username === username && u.password === password);

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'Invalid username or password'
            }, { status: 401 });
        }

        const token = generateToken(user.id);

        // Set cookie
        const cookieStore = await cookies();
        cookieStore.set('soc_auth', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 // 24 hours
        });

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role
            }
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
