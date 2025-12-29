import { NextResponse } from 'next/server';
import { wazuhFetch } from '../../../../lib/wazuh';

export async function GET() {
    try {
        const data = await wazuhFetch('/agents?limit=500');

        // Transform to simplified format for frontend
        const agents = data.data.affected_items.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            ip: agent.ip,
            status: agent.status,
            os: agent.os?.name || 'Unknown',
            version: agent.version,
            lastKeepAlive: agent.lastKeepAlive,
            group: agent.group || []
        }));

        return NextResponse.json({
            success: true,
            total: data.data.total_affected_items,
            agents
        });
    } catch (error: any) {
        console.error('Wazuh Agents Error:', error);

        // Return mock data for development/fallback
        return NextResponse.json({
            success: false,
            error: error.message,
            agents: [
                { id: '001', name: 'soc-agent-container', ip: '192.168.1.206', status: 'active', os: 'Ubuntu 24.04', version: '4.7.2' },
                { id: '002', name: 'web-server-01', ip: '192.168.1.100', status: 'active', os: 'CentOS 8', version: '4.7.2' },
                { id: '003', name: 'db-server-01', ip: '192.168.1.101', status: 'disconnected', os: 'Debian 11', version: '4.7.1' }
            ]
        });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, agentId } = body;

        if (action === 'restart' && agentId) {
            await wazuhFetch(`/agents/${agentId}/restart`, { method: 'PUT' });
            return NextResponse.json({ success: true, message: `Agent ${agentId} restart initiated` });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
