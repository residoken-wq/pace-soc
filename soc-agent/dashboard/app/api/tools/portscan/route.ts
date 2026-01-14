import { NextRequest, NextResponse } from 'next/server';
import net from 'net';

// Port scan API - checks if a specific port is open on a host
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const host = searchParams.get('host');
    const port = parseInt(searchParams.get('port') || '0');

    if (!host || !port) {
        return NextResponse.json({
            success: false,
            error: 'Missing host or port parameter'
        }, { status: 400 });
    }

    // Basic validation
    if (port < 1 || port > 65535) {
        return NextResponse.json({
            success: false,
            error: 'Invalid port number'
        }, { status: 400 });
    }

    // SSRF protection - only allow internal network ranges
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(host)) {
        const parts = host.split('.').map(Number);
        const isPrivate = (
            parts[0] === 10 ||
            (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
            (parts[0] === 192 && parts[1] === 168) ||
            parts[0] === 127
        );

        if (!isPrivate) {
            return NextResponse.json({
                success: false,
                error: 'External IPs not allowed for security reasons'
            }, { status: 403 });
        }
    }

    try {
        const isOpen = await checkPort(host, port, 2000);

        return NextResponse.json({
            success: true,
            host,
            port,
            open: isOpen,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            open: false
        });
    }
}

function checkPort(host: string, port: number, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });

        socket.connect(port, host);
    });
}
