import { NextResponse } from 'next/server';

// Debug endpoint to test Wazuh Indexer connectivity
export async function GET() {
    const results: any = {
        timestamp: new Date().toISOString(),
        environment: {},
        tests: []
    };

    // Check environment variables
    const WAZUH_INDEXER_URL = process.env.WAZUH_INDEXER_URL || 'https://127.0.0.1:9200';
    const WAZUH_INDEXER_USER = process.env.WAZUH_INDEXER_USER || 'admin';
    const WAZUH_INDEXER_PASSWORD = process.env.WAZUH_INDEXER_PASSWORD || process.env.WAZUH_API_PASSWORD || '';

    results.environment = {
        WAZUH_INDEXER_URL,
        WAZUH_INDEXER_USER,
        WAZUH_INDEXER_PASSWORD: WAZUH_INDEXER_PASSWORD ? '***SET***' : '***NOT SET***',
        NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED
    };

    // Disable SSL verification
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    // Test 1: Basic connectivity
    try {
        const response = await fetch(WAZUH_INDEXER_URL, {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${WAZUH_INDEXER_USER}:${WAZUH_INDEXER_PASSWORD}`).toString('base64')
            }
        });

        results.tests.push({
            name: 'Basic Connectivity',
            status: response.ok ? 'PASS' : 'FAIL',
            statusCode: response.status,
            message: response.ok ? 'Connected to Indexer' : await response.text()
        });
    } catch (error: any) {
        results.tests.push({
            name: 'Basic Connectivity',
            status: 'ERROR',
            message: error.message
        });
    }

    // Test 2: List indices
    try {
        const response = await fetch(`${WAZUH_INDEXER_URL}/_cat/indices?v&h=index,docs.count&format=json`, {
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${WAZUH_INDEXER_USER}:${WAZUH_INDEXER_PASSWORD}`).toString('base64')
            }
        });

        if (response.ok) {
            const indices = await response.json();
            const wazuhIndices = indices.filter((i: any) => i.index.includes('wazuh'));
            results.tests.push({
                name: 'List Wazuh Indices',
                status: 'PASS',
                indices: wazuhIndices
            });
        } else {
            results.tests.push({
                name: 'List Wazuh Indices',
                status: 'FAIL',
                statusCode: response.status
            });
        }
    } catch (error: any) {
        results.tests.push({
            name: 'List Wazuh Indices',
            status: 'ERROR',
            message: error.message
        });
    }

    // Test 3: Query alerts
    try {
        const query = {
            size: 5,
            sort: [{ '@timestamp': 'desc' }],
            query: { match_all: {} }
        };

        const response = await fetch(`${WAZUH_INDEXER_URL}/wazuh-alerts-*/_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(`${WAZUH_INDEXER_USER}:${WAZUH_INDEXER_PASSWORD}`).toString('base64')
            },
            body: JSON.stringify(query)
        });

        if (response.ok) {
            const data = await response.json();
            const hitCount = data.hits?.total?.value || 0;
            const sampleAlert = data.hits?.hits?.[0]?._source;

            results.tests.push({
                name: 'Query Alerts',
                status: 'PASS',
                totalAlerts: hitCount,
                sampleAlert: sampleAlert ? {
                    timestamp: sampleAlert['@timestamp'],
                    rule: sampleAlert.rule?.description,
                    agent: sampleAlert.agent?.name
                } : null
            });
        } else {
            const errorText = await response.text();
            results.tests.push({
                name: 'Query Alerts',
                status: 'FAIL',
                statusCode: response.status,
                error: errorText
            });
        }
    } catch (error: any) {
        results.tests.push({
            name: 'Query Alerts',
            status: 'ERROR',
            message: error.message
        });
    }

    return NextResponse.json(results, { status: 200 });
}
