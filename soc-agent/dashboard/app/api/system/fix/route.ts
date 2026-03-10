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

            const wazuhIndexerUrl = process.env.WAZUH_INDEXER_URL || 'https://127.0.0.1:9200';
            const wazuhIndexerUser = process.env.WAZUH_INDEXER_USER || 'admin';
            const wazuhIndexerPassword = process.env.WAZUH_INDEXER_PASSWORD || process.env.WAZUH_API_PASSWORD || '';
            let isIndexerReachable = false;
            let indexerMessage = '';

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                const res = await fetch(wazuhIndexerUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Basic ' + Buffer.from(`${wazuhIndexerUser}:${wazuhIndexerPassword}`).toString('base64')
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (res.ok) {
                    isIndexerReachable = true;
                } else if (res.status === 401) {
                    indexerMessage = 'Authentication Failed (HTTP 401): Check WAZUH_INDEXER_PASSWORD in .env';
                    isIndexerReachable = false;
                } else {
                    indexerMessage = `HTTP Error ${res.status}`;
                    isIndexerReachable = false;
                }
            } catch (err: any) {
                if (err.message.includes('ECONNREFUSED')) {
                    indexerMessage = `Connection Refused: Ensure Indexer is running on the host network.`;
                } else {
                    indexerMessage = err.message;
                }
                isIndexerReachable = false;
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
                {
                    step: 'Wazuh Indexer Reachability',
                    status: isIndexerReachable ? 'success' : 'error',
                    message: isIndexerReachable
                        ? `Successfully connected to Indexer at ${wazuhIndexerUrl}`
                        : `Could not connect to Indexer at ${wazuhIndexerUrl}. Error: ${indexerMessage}`,
                    recommendedAction: isIndexerReachable
                        ? null
                        : 'systemctl restart wazuh-indexer'
                }
            ];

            return NextResponse.json({
                success: true,
                diagnostics,
                overallStatus: (isWazuhReachable && isIndexerReachable) ? 'healthy' : 'degraded'
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
