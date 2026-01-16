import { NextResponse } from 'next/server';

// Wazuh Indexer config
const WAZUH_INDEXER_URL = process.env.WAZUH_INDEXER_URL || 'https://127.0.0.1:9200';
const WAZUH_INDEXER_USER = process.env.WAZUH_INDEXER_USER || 'admin';
const WAZUH_INDEXER_PASSWORD = process.env.WAZUH_INDEXER_PASSWORD || process.env.WAZUH_API_PASSWORD || '';

// Disable SSL verification for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface LogEntry {
    id: string;
    timestamp: string;
    level: 'error' | 'warn' | 'info' | 'debug';
    source: string;
    agent: string;
    agentIp: string;
    srcIp: string;  // Source/Attacker IP
    message: string;
    ruleId?: string;
    ruleLevel?: number;
}

// Helper to get better message details for generic alerts
function formatLogMessage(src: any): string {
    const description = src.rule?.description || 'No description';
    const fullLog = src.full_log || '';

    // Rootcheck/Syscheck generic messages -> Use full log for detail
    // Rule 510: Host-based anomaly detection event (rootcheck)
    // Rule 5710: Attempt to login using a non-existent user
    if (description.includes('Host-based anomaly detection event') ||
        description.includes('Integrity checksum changed') ||
        description.includes('Windows System error event')) {
        if (fullLog) return fullLog;
    }

    return description;
}

// Map numeric rule level to log level
function getLogLevel(ruleLevel: number): 'error' | 'warn' | 'info' | 'debug' {
    if (ruleLevel >= 12) return 'error';
    if (ruleLevel >= 7) return 'warn';
    if (ruleLevel >= 4) return 'info';
    return 'debug';
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '100');
        const levelFilter = searchParams.get('level');
        const sourceFilter = searchParams.get('source');
        const search = searchParams.get('search');
        const timeRange = searchParams.get('timeRange') || '24h';  // Default: last 24 hours

        let logs: LogEntry[] = [];

        // Build Elasticsearch query
        const mustClauses: any[] = [];

        // Time range filter - crucial for getting recent data
        mustClauses.push({
            range: {
                '@timestamp': {
                    gte: `now-${timeRange}`,
                    lte: 'now'
                }
            }
        });

        // Level filter - map to rule.level ranges
        if (levelFilter && levelFilter !== 'all') {
            switch (levelFilter) {
                case 'error':
                    mustClauses.push({ range: { 'rule.level': { gte: 12 } } });
                    break;
                case 'warn':
                    mustClauses.push({ range: { 'rule.level': { gte: 7, lt: 12 } } });
                    break;
                case 'info':
                    mustClauses.push({ range: { 'rule.level': { gte: 3, lt: 7 } } });
                    break;
                case 'debug':
                    mustClauses.push({ range: { 'rule.level': { lt: 3 } } });
                    break;
            }
        }

        // Source filter
        if (sourceFilter && sourceFilter !== 'all') {
            mustClauses.push({
                bool: {
                    should: [
                        { match: { 'rule.groups': sourceFilter } },
                        { match: { 'decoder.name': sourceFilter } },
                        { match: { 'predecoder.program_name': sourceFilter } }
                    ]
                }
            });
        }

        // Search filter
        if (search) {
            mustClauses.push({
                multi_match: {
                    query: search,
                    fields: ['rule.description', 'full_log', 'agent.name', 'data.*', 'location']
                }
            });
        }

        const query = {
            size: limit,
            sort: [{ '@timestamp': 'desc' }],
            query: mustClauses.length > 0
                ? { bool: { must: mustClauses } }
                : { match_all: {} },
            // Aggregation to get ALL unique sources across entire index
            aggs: {
                all_decoders: {
                    terms: { field: 'decoder.name', size: 50 }
                },
                all_rule_groups: {
                    terms: { field: 'rule.groups', size: 50 }
                }
            }
        };

        // Fetch from Wazuh Indexer
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
            console.error('Indexer error:', response.status, errorText);
            throw new Error(`Indexer returned ${response.status}`);
        }

        const data = await response.json();
        const hits = data.hits?.hits || [];

        // Map to LogEntry format
        logs = hits.map((hit: any) => {
            const src = hit._source;
            const ruleLevel = src.rule?.level || 0;

            // Extract source IP (attacker IP) from various Wazuh fields
            const srcIp = src.data?.srcip || src.data?.src_ip || src.data?.srcuser || '-';

            return {
                id: hit._id,
                timestamp: src['@timestamp'] || src.timestamp,
                level: getLogLevel(ruleLevel),
                source: src.rule?.groups?.[0] || src.decoder?.name || src.predecoder?.program_name || 'wazuh',
                agent: src.agent?.name || 'unknown',
                agentIp: src.agent?.ip || '-',
                srcIp: srcIp,
                message: formatLogMessage(src),
                ruleId: src.rule?.id,
                ruleLevel: ruleLevel
            };
        });

        // Extract sources from aggregation (covers ALL alerts, not just returned ones)
        const decoderBuckets = data.aggregations?.all_decoders?.buckets || [];
        const ruleGroupBuckets = data.aggregations?.all_rule_groups?.buckets || [];

        // Combine and deduplicate sources from both aggregations
        const allSources = new Set<string>();
        decoderBuckets.forEach((b: any) => allSources.add(b.key));
        ruleGroupBuckets.forEach((b: any) => allSources.add(b.key));

        const sources = [...allSources].sort();

        return NextResponse.json({
            success: true,
            total: data.hits?.total?.value || logs.length,
            source: 'wazuh-indexer',
            sources,
            logs,
            fetchedAt: new Date().toISOString()  // Add timestamp for debugging
        }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error: any) {
        console.error('Logs API Error:', error.message);

        return NextResponse.json({
            success: false,
            error: error.message,
            source: 'error',
            total: 0,
            logs: [],
            message: 'Cannot connect to Wazuh Indexer. Please check connection settings.'
        });
    }
}
