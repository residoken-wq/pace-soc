import { NextResponse } from 'next/server';

// Debug endpoint for Wazuh Manager API connectivity
export async function GET() {
    const results: any = {
        timestamp: new Date().toISOString(),
        environment: {},
        tests: []
    };

    // Environment check
    const WAZUH_MANAGER_URL = process.env.WAZUH_MANAGER_URL || 'https://127.0.0.1:55000';
    const WAZUH_API_USER = process.env.WAZUH_API_USER || 'wazuh-wui';
    const WAZUH_API_PASSWORD = process.env.WAZUH_API_PASSWORD || '';

    results.environment = {
        WAZUH_MANAGER_URL,
        WAZUH_API_USER,
        WAZUH_API_PASSWORD: WAZUH_API_PASSWORD ? '***SET***' : '***NOT SET***',
    };

    // Disable SSL verification
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    // Test 1: Basic connectivity
    try {
        const response = await fetch(WAZUH_MANAGER_URL, {
            method: 'GET'
        });

        results.tests.push({
            name: 'Basic Connectivity',
            status: response.ok || response.status === 401 ? 'PASS' : 'FAIL',
            statusCode: response.status,
            message: response.ok ? 'Connected' : 'Endpoint reachable'
        });
    } catch (error: any) {
        results.tests.push({
            name: 'Basic Connectivity',
            status: 'ERROR',
            message: error.message
        });
    }

    // Test 2: Get Auth Token
    try {
        const credentials = Buffer.from(`${WAZUH_API_USER}:${WAZUH_API_PASSWORD}`).toString('base64');

        const response = await fetch(`${WAZUH_MANAGER_URL}/security/user/authenticate`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const token = data.data?.token;

            results.tests.push({
                name: 'Get Auth Token',
                status: 'PASS',
                hasToken: !!token,
                tokenPreview: token ? token.substring(0, 30) + '...' : null
            });

            // Test 3: Get Agents with token
            if (token) {
                try {
                    const agentsResponse = await fetch(`${WAZUH_MANAGER_URL}/agents?limit=10`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (agentsResponse.ok) {
                        const agentsData = await agentsResponse.json();
                        results.tests.push({
                            name: 'Get Agents',
                            status: 'PASS',
                            totalAgents: agentsData.data?.total_affected_items || 0,
                            sampleAgent: agentsData.data?.affected_items?.[0]
                        });
                    } else {
                        results.tests.push({
                            name: 'Get Agents',
                            status: 'FAIL',
                            statusCode: agentsResponse.status
                        });
                    }
                } catch (error: any) {
                    results.tests.push({
                        name: 'Get Agents',
                        status: 'ERROR',
                        message: error.message
                    });
                }
            }
        } else {
            const errorText = await response.text();
            results.tests.push({
                name: 'Get Auth Token',
                status: 'FAIL',
                statusCode: response.status,
                error: errorText
            });
        }
    } catch (error: any) {
        results.tests.push({
            name: 'Get Auth Token',
            status: 'ERROR',
            message: error.message
        });
    }

    return NextResponse.json(results, { status: 200 });
}
