import { NextResponse } from 'next/server';

const WAZUH_INDEXER_URL = process.env.WAZUH_INDEXER_URL || 'https://192.168.1.206:9200';
const WAZUH_INDEXER_USER = process.env.WAZUH_INDEXER_USER || 'admin';
const WAZUH_INDEXER_PASSWORD = process.env.WAZUH_API_PASSWORD || 'kP+cJvIn1LQ6*MruHQNYfv.REn68RKP1';

interface LogEntry {
    id: string;
    timestamp: string;
    level: 'error' | 'warn' | 'info' | 'debug';
    source: string;
    agent: string;
    ip: string;
    message: string;
    ruleId?: string;
    ruleLevel?: number;
}

// Map Wazuh rule level to log level
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
        const level = searchParams.get('level'); // Optional filter
        const agent = searchParams.get('agent'); // Optional filter
        const search = searchParams.get('search'); // Optional search term

        // Build Elasticsearch query
        const must: any[] = [];

        // Level filter
        if (level && level !== 'all') {
            const levelMap: Record<string, { gte: number; lt?: number }> = {
                'error': { gte: 12 },
                'warn': { gte: 7, lt: 12 },
                'info': { gte: 4, lt: 7 },
                'debug': { gte: 0, lt: 4 }
            };
            if (levelMap[level]) {
                must.push({ range: { 'rule.level': levelMap[level] } });
            }
        }

        // Agent filter
        if (agent && agent !== 'all') {
            must.push({ match: { 'agent.name': agent } });
        }

        // Search term
        if (search) {
            must.push({
                multi_match: {
                    query: search,
                    fields: ['rule.description', 'full_log', 'agent.name', 'location']
                }
            });
        }

        const query = {
            size: limit,
            sort: [{ '@timestamp': 'desc' }],
            query: must.length > 0 ? { bool: { must } } : { match_all: {} }
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
            throw new Error(`Wazuh Indexer error: ${response.status}`);
        }

        const data = await response.json();
        const hits = data.hits?.hits || [];

        // Transform Wazuh alerts to log entries
        const logs: LogEntry[] = hits.map((hit: any, index: number) => {
            const source = hit._source;
            const ruleLevel = source.rule?.level || 0;

            return {
                id: hit._id || `log-${index}`,
                timestamp: source['@timestamp'] || source.timestamp,
                level: getLogLevel(ruleLevel),
                source: source.decoder?.name || source.manager?.name || 'wazuh',
                agent: source.agent?.name || 'unknown',
                ip: source.agent?.ip || '-',
                message: source.rule?.description || source.full_log || 'No description',
                ruleId: source.rule?.id,
                ruleLevel: ruleLevel
            };
        });

        return NextResponse.json({
            success: true,
            total: data.hits?.total?.value || logs.length,
            source: 'wazuh-indexer',
            logs
        });

    } catch (error: any) {
        console.error('Logs API Error:', error.message);

        // Return empty logs with error info (no more mock data)
        return NextResponse.json({
            success: false,
            error: error.message,
            source: 'error',
            total: 0,
            logs: []
        });
    }
}
