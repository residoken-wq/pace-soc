import { NextResponse } from 'next/server';
import { wazuhFetch } from '../../../../lib/wazuh';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, query, agentId } = body;

        // 1. Search Agents
        if (action === 'search_agents') {
            // Fetch agents matching the query
            // Wazuh API filter: ?q=name~QUERY OR id=QUERY OR ip~QUERY (simplified here)
            // Just fetching generic active/disconnected agents and filtering in memory for better UX if count is low
            // or filtering via API params if possible.
            // Let's use Wazuh API's 'search' parameter on GET /agents.

            // Note: wazuhFetch wrapper usually handles auth.
            const data = await wazuhFetch(`/agents?search=${encodeURIComponent(query)}&limit=10`);

            if (!data.data?.affected_items) {
                return NextResponse.json({ success: true, agents: [] });
            }

            const agents = data.data.affected_items.map((a: any) => ({
                id: a.id,
                name: a.name,
                ip: a.ip || 'N/A',
                status: a.status,
                os: {
                    name: a.os?.name || 'Unknown',
                    platform: a.os?.platform || 'Unknown',
                    version: a.os?.version || ''
                },
                version: a.version || 'Unknown',
                lastKeepAlive: a.lastKeepAlive || 'N/A'
            }));

            return NextResponse.json({ success: true, agents });
        }

        // 2. Get Alerts for specific Agent
        if (action === 'get_alerts' && agentId) {
            // To get alerts for a specific agent, we need to query the Indexer (Elasticsearch/OpenSearch).
            // However, the wazuhFetch is typically for the Manager API.
            // The Manager API allows getting alerts via GET /manager/logs but filtered? No.
            // We usually need the Indexer API for this.
            // Fallback: Using /syscheck/AGENT_ID or /rootcheck/AGENT_ID for file/rootkit events as 'alerts'
            // OR if we have a way to query "security-alerts" via API.
            // 
            // Since this is a simple dashboard, let's verify if we can fetch from /manager/logs and filter? No, that's global.
            // 
            // Let's try to query syscheck and rootcheck recent events for this agent as a proxy for "Threats"

            let alerts: any[] = [];

            // FIM Events
            try {
                const sys = await wazuhFetch(`/syscheck/${agentId}?limit=5&sort=-date`);
                if (sys.data?.affected_items) {
                    alerts.push(...sys.data.affected_items.map((i: any) => ({
                        id: 'fim-' + i.file,
                        timestamp: i.date,
                        rule: { id: 'FIM', level: 7, description: `File ${i.event}: ${i.file}` },
                        fullLog: `FIM Event: ${i.event} on ${i.file}`
                    })));
                }
            } catch (e) { }

            // Rootcheck Events
            try {
                const root = await wazuhFetch(`/rootcheck/${agentId}?limit=5`);
                if (root.data?.affected_items) {
                    alerts.push(...root.data.affected_items.map((i: any) => ({
                        id: 'rc-' + i.event,
                        timestamp: i.date_last,
                        rule: { id: 'Rootcheck', level: 10, description: i.event },
                        fullLog: i.event
                    })));
                }
            } catch (e) { }

            // Sort desc
            alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            return NextResponse.json({ success: true, alerts });
        }

        // 3. Restart Agent
        if (action === 'restart_agent' && agentId) {
            // Trigger Active Response to restart?
            // Or use the /agents/AGENT_ID/restart API if available?
            // Wazuh API has PUT /agents/:agent_id/restart (Requires Active Response enabled on agent)

            const res = await wazuhFetch(`/agents/${agentId}/restart`, { method: 'PUT' });

            if (res.error === 0) {
                return NextResponse.json({ success: true, message: 'Restart command sent.' });
            } else {
                return NextResponse.json({ success: false, message: res.message || 'Failed to restart.' });
            }
        }

        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

    } catch (e: any) {
        console.error("Inspector API Error:", e);
        return NextResponse.json({ success: false, message: e.message || 'Server Error' }, { status: 500 });
    }
}
