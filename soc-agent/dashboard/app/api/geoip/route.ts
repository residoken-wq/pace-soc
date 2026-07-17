import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        available: false,
        message: 'GeoIP telemetry is not configured; synthetic values are disabled.',
        data: []
    });
}
