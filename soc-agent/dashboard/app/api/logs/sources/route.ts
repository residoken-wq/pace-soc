import { NextResponse } from 'next/server';

// Debug endpoint to check all unique sources in Wazuh Indexer
const WAZUH_INDEXER_URL = process.env.WAZUH_INDEXER_URL || 'https://127.0.0.1:9200';
const WAZUH_INDEXER_USER = process.env.WAZUH_INDEXER_USER || 'admin';
const WAZUH_INDEXER_PASSWORD = process.env.WAZUH_INDEXER_PASSWORD || process.env.WAZUH_API_PASSWORD || '';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function GET() {
    try {
        // Aggregation query to get all unique sources
        const query = {
            size: 0,
            aggs: {
                // Group by decoder.name
                decoders: {
                    terms: { field: 'decoder.name', size: 100 }
                },
                // Group by rule.groups
                rule_groups: {
                    terms: { field: 'rule.groups', size: 100 }
                },
                // Group by agent name
                agents: {
                    terms: { field: 'agent.name', size: 100 }
                },
                // Group by agent OS platform
                os_platforms: {
                    terms: { field: 'agent.os.platform', size: 20 }
                },
                // Group by predecoder program
                programs: {
                    terms: { field: 'predecoder.program_name', size: 100 }
                }
            }
        };

        const response = await fetch(`${WAZUH_INDEXER_URL}/wazuh-alerts-*/_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(`${WAZUH_INDEXER_USER}:${WAZUH_INDEXER_PASSWORD}`).toString('base64')
            },
            body: JSON.stringify(query)
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({
                success: false,
                error: `Indexer returned ${response.status}`,
                details: errorText
            }, { status: 500 });
        }

        const data = await response.json();
        const aggs = data.aggregations;

        // Extract values with their counts
        const extractBuckets = (buckets: any[]) =>
            buckets?.map(b => ({ name: b.key, count: b.doc_count })) || [];

        return NextResponse.json({
            success: true,
            totalAlerts: data.hits?.total?.value || 0,
            sources: {
                decoders: extractBuckets(aggs?.decoders?.buckets),
                ruleGroups: extractBuckets(aggs?.rule_groups?.buckets),
                agents: extractBuckets(aggs?.agents?.buckets),
                osPlatforms: extractBuckets(aggs?.os_platforms?.buckets),
                programs: extractBuckets(aggs?.programs?.buckets)
            }
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
