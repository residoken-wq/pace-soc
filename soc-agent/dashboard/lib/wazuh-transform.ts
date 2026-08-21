export interface WazuhAgentSource {
    id: string;
    name: string;
    ip?: string;
    status?: string;
    os?: { name?: string };
    version?: string;
    lastKeepAlive?: string;
    group?: string[];
}

export interface DashboardAgent {
    id: string;
    name: string;
    ip?: string;
    status?: string;
    os: string;
    version?: string;
    lastKeepAlive?: string;
    group: string[];
}

export function transformWazuhAgent(agent: WazuhAgentSource): DashboardAgent {
    return {
        id: agent.id,
        name: agent.name,
        ip: agent.ip,
        status: agent.status,
        os: agent.os?.name || 'Unknown',
        version: agent.version,
        lastKeepAlive: agent.lastKeepAlive,
        group: agent.group || []
    };
}

export function transformWazuhAgents(agents: WazuhAgentSource[]): DashboardAgent[] {
    return agents.map(transformWazuhAgent);
}
