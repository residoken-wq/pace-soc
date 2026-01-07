import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        const cookieStore = await cookies();

        // Clear the auth cookie
        cookieStore.delete('soc_auth');

        return NextResponse.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

export async function GET() {
    // Also support GET for simple logout links
    return POST();
}
