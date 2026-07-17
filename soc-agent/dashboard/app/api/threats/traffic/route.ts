
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        available: false,
        error: 'Traffic telemetry is not configured; synthetic values are disabled.'
    }, { status: 503 });
}
