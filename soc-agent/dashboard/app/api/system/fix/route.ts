import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'diagnose') {
            // Simulated diagnosis for now, in a real scenario we'd check connectivity, configs, etc.
            const wazuhManagerUrl = process.env.WAZUH_MANAGER_URL || 'https://192.168.1.206:55000';
            let isWazuhReachable = false;
            let errorMessage = '';

            try {
                // Quick connectivity check
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                // We just need to know if the port is open and responding to HTTP/S
                const res = await fetch(wazuhManagerUrl, {
                    method: 'GET',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                isWazuhReachable = true;
            } catch (err: any) {
                errorMessage = err.message;
                isWazuhReachable = false;
            }

            const diagnostics = [
                {
                    step: 'Wazuh Manager Reachability',
                    status: isWazuhReachable ? 'success' : 'error',
                    message: isWazuhReachable
                        ? `Successfully reached Manager at ${wazuhManagerUrl}`
                        : `Could not reach Manager at ${wazuhManagerUrl}. Error: ${errorMessage}`,
                    recommendedAction: isWazuhReachable
                        ? null
                        : 'systemctl restart wazuh-manager'
                },
                // Add more diagnostics here as needed
            ];

            return NextResponse.json({
                success: true,
                diagnostics,
                overallStatus: isWazuhReachable ? 'healthy' : 'degraded'
            });
        }

        if (action === 'fix') {
            // In a Docker environment, the dashboard container often cannot directly run `systemctl` on the host.
            // We return instructions for the admin to execute.
            return NextResponse.json({
                success: true,
                message: 'Auto-fix commands generated. Please run these on the host machine.',
                commands: [
                    'systemctl restart wazuh-manager',
                    'systemctl restart filebeat'
                ]
            });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
