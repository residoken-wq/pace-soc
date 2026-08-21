import { NextResponse } from 'next/server';
import { wazuhFetch } from '../../../../lib/wazuh';
import { transformWazuhAgents, type WazuhAgentSource } from '../../../../lib/wazuh-transform';
import { REQUEST_ID_HEADER, resolveRequestId } from '../../../../lib/request-context';
import {
    auditActorFromHeaders,
    createSecurityAuditEvent,
    emitSecurityAudit
} from '../../../../lib/security-audit';

const WAZUH_AGENT_ID_PATTERN = /^\d{3,}$/;

export async function GET() {
    try {
        const data = await wazuhFetch('/agents?limit=500');

        // Transform to simplified format for frontend
        const agents = transformWazuhAgents(data.data.affected_items as WazuhAgentSource[]);

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
    const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
    const actor = auditActorFromHeaders(request.headers);
    const sourceIp = request.headers.get('x-real-ip')
        || request.headers.get('x-forwarded-for')?.split(',')[0].trim();
    let agentId: string | undefined;

    try {
        const body = await request.json();
        const action = typeof body.action === 'string' ? body.action : undefined;
        agentId = typeof body.agentId === 'string' ? body.agentId : undefined;

        if (action === 'restart' && agentId && WAZUH_AGENT_ID_PATTERN.test(agentId)) {
            await wazuhFetch(`/agents/${agentId}/restart`, { method: 'PUT' });
            emitSecurityAudit(createSecurityAuditEvent({
                requestId,
                actor,
                action: 'wazuh.agent.restart',
                target: { type: 'wazuh-agent', id: agentId },
                outcome: 'success',
                sourceIp
            }));
            return NextResponse.json({ success: true, message: `Agent ${agentId} restart initiated` });
        }

        emitSecurityAudit(createSecurityAuditEvent({
            requestId,
            actor,
            action: 'wazuh.agent.restart',
            target: { type: 'wazuh-agent', ...(agentId ? { id: agentId } : {}) },
            outcome: 'denied',
            sourceIp,
            metadata: { reason: 'invalid action or agent identifier' }
        }));
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error: unknown) {
        emitSecurityAudit(createSecurityAuditEvent({
            requestId,
            actor,
            action: 'wazuh.agent.restart',
            target: { type: 'wazuh-agent', ...(agentId ? { id: agentId } : {}) },
            outcome: 'failure',
            sourceIp,
            metadata: { errorType: error instanceof Error ? error.name : 'UnknownError' }
        }));
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
