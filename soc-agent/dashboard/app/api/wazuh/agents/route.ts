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

        // Return empty array when Wazuh is not available
        return NextResponse.json({
            success: false,
            error: error.message,
            agents: [],
            message: 'Cannot connect to Wazuh Manager. Use Network Tools to scan for hosts and install agents.'
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
