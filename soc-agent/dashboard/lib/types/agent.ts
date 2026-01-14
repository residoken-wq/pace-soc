// Agent type definitions

export interface Agent {
    id: string;
    name: string;
    ip: string;
    status: 'active' | 'disconnected' | 'never_connected' | 'pending';
    os?: string;
    version?: string;
    lastKeepAlive?: string;
    group?: string[];
}

export interface AgentMetrics {
    cpu: number;
    memory: number;
    storage: number;
    network?: number;
}

export interface AgentWithMetrics extends Agent {
    metrics?: AgentMetrics;
}
