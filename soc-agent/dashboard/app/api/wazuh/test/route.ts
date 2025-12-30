import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { managerUrl, apiUser, apiPassword } = body;

        if (!managerUrl || !apiUser || !apiPassword) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: managerUrl, apiUser, apiPassword'
            }, { status: 400 });
        }

        // Test connection to Wazuh Manager
        const credentials = Buffer.from(`${apiUser}:${apiPassword}`).toString('base64');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const response = await fetch(`${managerUrl}/security/user/authenticate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();

                // Get manager info
                const token = data.data.token;
                const infoResponse = await fetch(`${managerUrl}/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                let managerInfo = null;
                if (infoResponse.ok) {
                    const info = await infoResponse.json();
                    managerInfo = info.data;
                }

                return NextResponse.json({
                    success: true,
                    message: 'Connection successful',
                    connected: true,
                    token: token.substring(0, 20) + '...',
                    managerInfo
                });
            } else {
                return NextResponse.json({
                    success: false,
                    error: `Authentication failed: ${response.status} ${response.statusText}`,
                    connected: false
                });
            }

        } catch (fetchError: any) {
            clearTimeout(timeoutId);

            if (fetchError.name === 'AbortError') {
                return NextResponse.json({
                    success: false,
                    error: 'Connection timeout - Wazuh Manager not reachable',
                    connected: false
                });
            }

            return NextResponse.json({
                success: false,
                error: `Connection failed: ${fetchError.message}`,
                connected: false,
                hint: 'Check if Wazuh Manager is running and port 55000 is accessible'
            });
        }

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// Get current connection status
export async function GET() {
    const managerUrl = process.env.WAZUH_MANAGER_URL || 'https://192.168.1.206:55000';
    const apiUser = process.env.WAZUH_API_USER || 'wazuh-wui';

    return NextResponse.json({
        success: true,
        config: {
            managerUrl,
            apiUser,
            passwordSet: !!process.env.WAZUH_API_PASSWORD
        }
    });
}
