import { NextRequest, NextResponse } from 'next/server';

const WAZUH_INDEXER_URL = process.env.WAZUH_INDEXER_URL || 'https://127.0.0.1:9200';
const WAZUH_INDEXER_USER = process.env.WAZUH_INDEXER_USER || 'admin';
const WAZUH_INDEXER_PASSWORD = process.env.WAZUH_INDEXER_PASSWORD || process.env.WAZUH_API_PASSWORD || '';

// Disable SSL verification for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function GET(request: NextRequest) {
    try {
        // Query last 30 days of alerts
        const query = {
            size: 0, // We only want aggregations
            query: {
                bool: {
                    must: [
                        { range: { '@timestamp': { gte: 'now-30d/d' } } },
                        { exists: { field: "rule.mitre.id" } } // Only alerts with MITRE ID
                    ]
                }
            },
            aggs: {
                techniques: {
                    terms: {
                        field: "rule.mitre.id",
                        size: 200 // Top 200 techniques
                    },
                    aggs: {
                        agents: {
                            terms: {
                                field: "agent.name", // Group by agent name
                                size: 10
                            },
                            aggs: {
                                top_hits_agent: {
                                    top_hits: {
                                        size: 1,
                                        _source: {
                                            includes: ["agent.id", "agent.ip", "@timestamp"]
                                        }
                                    }
                                }
                            }
                        }
                    }
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
            throw new Error(`Indexer error: ${response.status}`);
        }

        const data = await response.json();

        // Transform aggregations
        const results = data.aggregations.techniques.buckets.map((bucket: any) => {
            const techniqueId = bucket.key;
            const totalCount = bucket.doc_count;

            const agents = bucket.agents.buckets.map((agentBucket: any) => {
                const hitSource = agentBucket.top_hits_agent.hits.hits[0]._source;
                return {
                    name: agentBucket.key,
                    id: hitSource.agent?.id || '000',
                    ip: hitSource.agent?.ip || '-',
                    count: agentBucket.doc_count,
                    lastSeen: hitSource['@timestamp']
                };
            });

            return {
                techniqueId,
                count: totalCount,
                agents
            };
        });

        return NextResponse.json(results);

    } catch (error) {
        console.error('Error fetching MITRE stats:', error);
        return NextResponse.json({ error: 'Failed to fetch MITRE stats' }, { status: 500 });
    }
}
