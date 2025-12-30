import { NextResponse } from 'next/server';
import { wazuhFetch } from '../../../../lib/wazuh';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');

        // Try to get alerts from Wazuh API syscheck events or security events
        // First try: Use manager/logs for recent events
        let alerts: any[] = [];
        let total = 0;

        try {
            // Option 1: Get security events from manager logs
            const logsData = await wazuhFetch('/manager/logs?limit=100&sort=-timestamp');

            if (logsData.data?.affected_items) {
                alerts = logsData.data.affected_items
                    .filter((log: any) => log.level && ['ERROR', 'WARNING', 'CRITICAL'].includes(log.level))
                    .slice(0, limit)
                    .map((log: any, index: number) => ({
                        id: `log-${Date.now()}-${index}`,
                        timestamp: log.timestamp,
                        rule: {
                            id: log.tag || 'manager',
                            level: log.level === 'CRITICAL' ? 15 : log.level === 'ERROR' ? 12 : log.level === 'WARNING' ? 7 : 3,
                            description: log.description || log.tag
                        },
                        agent: {
                            id: '000',
                            name: 'wazuh-manager',
                            ip: '127.0.0.1'
                        },
                        location: 'manager',
                        fullLog: log.description
                    }));
                total = alerts.length;
            }
        } catch (e) {
            console.log('Manager logs not available, trying syscheck...');
        }

        // Option 2: Get syscheck events (file integrity monitoring)
        if (alerts.length === 0) {
            try {
                const agentsData = await wazuhFetch('/agents?status=active&limit=10');
                const activeAgents = agentsData.data?.affected_items || [];

                for (const agent of activeAgents.slice(0, 5)) {
                    try {
                        const syscheckData = await wazuhFetch(`/syscheck/${agent.id}?limit=10&sort=-date`);
                        if (syscheckData.data?.affected_items) {
                            const agentAlerts = syscheckData.data.affected_items.map((item: any, index: number) => ({
                                id: `syscheck-${agent.id}-${index}`,
                                timestamp: item.date || new Date().toISOString(),
                                rule: {
                                    id: 'syscheck',
                                    level: item.event === 'deleted' ? 12 : item.event === 'modified' ? 7 : 3,
                                    description: `File ${item.event}: ${item.file}`
                                },
                                agent: {
                                    id: agent.id,
                                    name: agent.name,
                                    ip: agent.ip || 'N/A'
                                },
                                location: item.file,
                                fullLog: JSON.stringify(item)
                            }));
                            alerts = [...alerts, ...agentAlerts];
                        }
                    } catch (e) {
                        // Continue with other agents
                    }
                }
                total = alerts.length;
            } catch (e) {
                console.log('Syscheck not available');
            }
        }

        // Option 3: Get rootcheck events
        if (alerts.length === 0) {
            try {
                const agentsData = await wazuhFetch('/agents?status=active&limit=5');
                const activeAgents = agentsData.data?.affected_items || [];

                for (const agent of activeAgents) {
                    try {
                        const rootcheckData = await wazuhFetch(`/rootcheck/${agent.id}?limit=10`);
                        if (rootcheckData.data?.affected_items) {
                            const agentAlerts = rootcheckData.data.affected_items.map((item: any, index: number) => ({
                                id: `rootcheck-${agent.id}-${index}`,
                                timestamp: item.date_last || new Date().toISOString(),
                                rule: {
                                    id: 'rootcheck',
                                    level: 7,
                                    description: item.event || 'Rootcheck event'
                                },
                                agent: {
                                    id: agent.id,
                                    name: agent.name,
                                    ip: agent.ip || 'N/A'
                                },
                                location: 'rootcheck',
                                fullLog: item.event
                            }));
                            alerts = [...alerts, ...agentAlerts];
                        }
                    } catch (e) {
                        // Continue
                    }
                }
                total = alerts.length;
            } catch (e) {
                console.log('Rootcheck not available');
            }
        }

        // Sort by timestamp
        alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return NextResponse.json({
            success: true,
            total,
            alerts: alerts.slice(0, limit)
        });
    } catch (error: any) {
        console.error('Wazuh Alerts Error:', error);

        // Return empty array when Wazuh is not available
        return NextResponse.json({
            success: false,
            error: error.message,
            alerts: [],
            message: 'Cannot connect to Wazuh Manager. Install agents to start receiving alerts.'
        });
    }
}
