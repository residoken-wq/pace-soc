import { NextRequest } from 'next/server';

const WAZUH_INDEXER_URL = process.env.WAZUH_INDEXER_URL || 'https://192.168.1.206:9200';
const WAZUH_INDEXER_USER = process.env.WAZUH_INDEXER_USER || 'admin';
const WAZUH_INDEXER_PASSWORD = process.env.WAZUH_API_PASSWORD || 'kP+cJvIn1LQ6*MruHQNYfv.REn68RKP1';

// Disable SSL verification for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface SecurityAlert {
    id: string;
    timestamp: string;
    rule: {
        id: string;
        level: number;
        description: string;
        mitre?: { id: string; tactic: string }[];
    };
    agent: {
        id: string;
        name: string;
        ip: string;
    };
    attackType: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
}

// Map rule IDs to attack types
function getAttackType(ruleId: string, ruleLevel: number, description: string): string {
    const desc = description.toLowerCase();

    // Brute-force detection
    if (ruleId.match(/^571[0-9]/) || ruleId.match(/^576[0-9]/) || desc.includes('brute force') || desc.includes('multiple failed')) {
        return 'Brute-force Attack';
    }

    // DDoS / Connection flood
    if (desc.includes('ddos') || desc.includes('flood') || desc.includes('too many connections')) {
        return 'DDoS Attack';
    }

    // Abnormal login
    if (desc.includes('login') && (desc.includes('unusual') || desc.includes('new ip') || desc.includes('root'))) {
        return 'Abnormal Login';
    }

    // File integrity / Malicious file
    if (ruleId.match(/^55[0-4]/) || desc.includes('integrity') || desc.includes('rootkit') || desc.includes('malware')) {
        return 'Malicious File Activity';
    }

    // Privilege escalation
    if (desc.includes('sudo') || desc.includes('privilege') || desc.includes('escalation')) {
        return 'Privilege Escalation';
    }

    // SSH related
    if (desc.includes('ssh')) {
        return 'SSH Security Event';
    }

    // Generic based on level
    if (ruleLevel >= 12) return 'Critical Security Event';
    if (ruleLevel >= 10) return 'High Security Event';

    return 'Security Event';
}

function getSeverity(ruleLevel: number): 'critical' | 'high' | 'medium' | 'low' {
    if (ruleLevel >= 12) return 'critical';
    if (ruleLevel >= 10) return 'high';
    if (ruleLevel >= 7) return 'medium';
    return 'low';
}

async function fetchLatestAlerts(since?: string): Promise<SecurityAlert[]> {
    try {
        const query: any = {
            size: 50,
            sort: [{ '@timestamp': 'desc' }],
            query: {
                bool: {
                    must: [
                        { range: { 'rule.level': { gte: 3 } } } // Include SSH alerts (level 5)
                    ]
                }
            }
        };

        // If we have a timestamp, only fetch newer alerts
        if (since) {
            query.query.bool.must.push({
                range: { '@timestamp': { gt: since } }
            });
        }

        const response = await fetch(`${WAZUH_INDEXER_URL}/wazuh-alerts-*/_search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(`${WAZUH_INDEXER_USER}:${WAZUH_INDEXER_PASSWORD}`).toString('base64')
            },
            body: JSON.stringify(query)
        });

        if (!response.ok) {
            console.error('Indexer error:', response.status);
            return [];
        }

        const data = await response.json();
        const hits = data.hits?.hits || [];

        return hits.map((hit: any) => {
            const src = hit._source;
            const ruleLevel = src.rule?.level || 0;
            const ruleDesc = src.rule?.description || '';
            const ruleId = src.rule?.id || '';

            return {
                id: hit._id,
                timestamp: src['@timestamp'],
                rule: {
                    id: ruleId,
                    level: ruleLevel,
                    description: ruleDesc,
                    mitre: src.rule?.mitre?.id ? [{ id: src.rule.mitre.id[0], tactic: src.rule.mitre.tactic?.[0] || '' }] : undefined
                },
                agent: {
                    id: src.agent?.id || '000',
                    name: src.agent?.name || 'unknown',
                    ip: src.agent?.ip || '-'
                },
                attackType: getAttackType(ruleId, ruleLevel, ruleDesc),
                severity: getSeverity(ruleLevel)
            };
        });
    } catch (error) {
        console.error('Error fetching alerts:', error);
        return [];
    }
}

export async function GET(request: NextRequest) {
    const encoder = new TextEncoder();
    let lastTimestamp: string | undefined;
    let isActive = true;

    const stream = new ReadableStream({
        async start(controller) {
            // Send initial connection message
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', message: 'Alert stream connected' })}\n\n`));

            // Polling loop
            const poll = async () => {
                while (isActive) {
                    try {
                        const alerts = await fetchLatestAlerts(lastTimestamp);

                        if (alerts.length > 0) {
                            // Update last timestamp
                            lastTimestamp = alerts[0].timestamp;

                            // Send each alert
                            for (const alert of alerts) {
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'alert', alert })}\n\n`));
                            }
                        }

                        // Heartbeat every poll cycle
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', time: new Date().toISOString() })}\n\n`));

                    } catch (error) {
                        console.error('Stream error:', error);
                    }

                    // Wait 5 seconds before next poll
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            };

            poll();
        },
        cancel() {
            isActive = false;
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
