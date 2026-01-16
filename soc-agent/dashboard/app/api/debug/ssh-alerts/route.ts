import { NextResponse } from 'next/server';

const WAZUH_INDEXER_URL = process.env.WAZUH_INDEXER_URL || 'https://127.0.0.1:9200';
const WAZUH_INDEXER_USER = process.env.WAZUH_INDEXER_USER || 'admin';
const WAZUH_INDEXER_PASSWORD = process.env.WAZUH_INDEXER_PASSWORD || process.env.WAZUH_API_PASSWORD || '';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get('agent') || 'webmon';
    const minutes = parseInt(searchParams.get('minutes') || '30');

    try {
        // Query for SSH-related alerts from specific agent in last N minutes
        const query = {
            size: 50,
            sort: [{ '@timestamp': 'desc' }],
            query: {
                bool: {
                    must: [
                        {
                            range: {
                                '@timestamp': {
                                    gte: `now-${minutes}m`,
                                    lte: 'now'
                                }
                            }
                        }
                    ],
                    should: [
                        { match: { 'agent.name': agent } },
                        { match: { 'decoder.name': 'sshd' } },
                        { match: { 'decoder.name': 'pam' } },
                        { wildcard: { 'rule.id': '571*' } },
                        { wildcard: { 'rule.id': '540*' } },
                        { match: { 'rule.groups': 'authentication_failed' } },
                        { match: { 'rule.groups': 'sshd' } }
                    ],
                    minimum_should_match: 1
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
            throw new Error(`Indexer returned ${response.status}`);
        }

        const data = await response.json();
        const hits = data.hits?.hits || [];

        // Format alerts for debugging
        const alerts = hits.map((hit: any) => {
            const src = hit._source;
            return {
                timestamp: src['@timestamp'],
                agent: src.agent?.name,
                agentIp: src.agent?.ip,
                ruleId: src.rule?.id,
                ruleLevel: src.rule?.level,
                ruleDescription: src.rule?.description,
                ruleGroups: src.rule?.groups,
                decoder: src.decoder?.name,
                srcIp: src.data?.srcip || src.data?.src_ip,
                srcUser: src.data?.srcuser,
                fullLog: src.full_log?.substring(0, 200)
            };
        });

        // Group by rule ID for summary
        const ruleIdCounts: Record<string, number> = {};
        alerts.forEach((a: any) => {
            const id = a.ruleId || 'unknown';
            ruleIdCounts[id] = (ruleIdCounts[id] || 0) + 1;
        });

        return NextResponse.json({
            success: true,
            query: {
                agent,
                timeRange: `last ${minutes} minutes`,
                timestamp: new Date().toISOString()
            },
            totalAlerts: hits.length,
            ruleIdSummary: ruleIdCounts,
            alerts
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
