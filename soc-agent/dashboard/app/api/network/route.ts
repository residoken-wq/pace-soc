import { NextResponse } from 'next/server';

// Network scan/ping API for discovering agents
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, targets } = body;

        if (action === 'ping') {
            if (!Array.isArray(targets) || targets.length < 1 || targets.length > 32 || targets.some((ip: unknown) => typeof ip !== 'string' || !isPrivateIpv4(ip))) {
                return NextResponse.json({ success: false, error: 'Provide 1-32 private IPv4 targets' }, { status: 400 });
            }
            // Ping specific IP addresses
            const results = await Promise.all(
                targets.map(async (ip: string) => {
                    try {
                        // Try to connect to common Wazuh agent port (1514)
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 2000);

                        // Simple HTTP check - in production, use actual ping
                        const start = Date.now();
                        try {
                            await fetch(`http://${ip}:9100/metrics`, {
                                signal: controller.signal,
                                method: 'HEAD'
                            });
                            clearTimeout(timeoutId);
                            return {
                                ip,
                                status: 'online',
                                latency: Date.now() - start,
                                service: 'node_exporter'
                            };
                        } catch {
                            clearTimeout(timeoutId);
                            return {
                                ip,
                                status: 'offline',
                                latency: null,
                                service: null
                            };
                        }
                    } catch {
                        return {
                            ip,
                            status: 'error',
                            latency: null,
                            service: null
                        };
                    }
                })
            );

            return NextResponse.json({
                success: true,
                results
            });
        }

        if (action === 'scan') {
            // Scan a subnet (e.g., 192.168.1.0/24)
            const { subnet } = body;
            if (typeof subnet !== 'string' || !/^((10|192\.168)\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3})\.0\/24$/.test(subnet)) {
                return NextResponse.json({ success: false, error: 'Only private /24 subnets are allowed' }, { status: 400 });
            }
            const baseIP = subnet.split('/')[0].split('.').slice(0, 3).join('.');

            // Scan common host range (1-254)
            const scanTargets = Array.from({ length: 20 }, (_, i) => `${baseIP}.${i + 1}`);

            const results = await Promise.all(
                scanTargets.map(async (ip: string) => {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 1500);

                        const start = Date.now();
                        try {
                            await fetch(`http://${ip}:9100/metrics`, {
                                signal: controller.signal,
                                method: 'HEAD'
                            });
                            clearTimeout(timeoutId);
                            return {
                                ip,
                                status: 'online',
                                latency: Date.now() - start
                            };
                        } catch {
                            clearTimeout(timeoutId);
                            return { ip, status: 'offline', latency: null };
                        }
                    } catch {
                        return { ip, status: 'error', latency: null };
                    }
                })
            );

            // Filter to only show online hosts
            const onlineHosts = results.filter(r => r.status === 'online');

            return NextResponse.json({
                success: true,
                subnet,
                scanned: scanTargets.length,
                online: onlineHosts.length,
                results: onlineHosts
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Invalid action. Use: ping, scan'
        }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

function isPrivateIpv4(ip: string): boolean {
    const octets = ip.split('.').map(Number);
    if (octets.length !== 4 || octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return false;
    return octets[0] === 10 || octets[0] === 192 && octets[1] === 168 || octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31;
}
