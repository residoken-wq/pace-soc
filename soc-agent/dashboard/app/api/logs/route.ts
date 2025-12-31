import { NextResponse } from 'next/server';

// Mock logs - in production, this would fetch from Loki, Elasticsearch, or file system
const generateMockLogs = () => {
    const sources = ['wazuh-agent', 'promtail', 'node-exporter', 'sshd', 'nginx', 'docker'];
    const levels: ('error' | 'warn' | 'info' | 'debug')[] = ['error', 'warn', 'info', 'debug'];

    // Agent definition with IPs
    const agents = [
        { name: 'soc-main', ip: '127.0.0.1' },
        { name: 'web-srv-01', ip: '192.168.0.195' },
        { name: 'db-primary', ip: '10.0.0.5' },
        { name: 'atm-01', ip: '125.212.254.176' }
    ];

    const messages: Record<string, string[]> = {
        error: [
            'Connection refused to remote host',
            'Failed to authenticate user',
            'Disk space critical: 95% used',
            'Service crashed unexpectedly',
            'SSL certificate validation failed'
        ],
        warn: [
            'High memory usage detected: 85%',
            'Connection timeout, retrying...',
            'Deprecated API endpoint accessed',
            'Rate limit approaching threshold',
            'Failed login attempt from unknown IP'
        ],
        info: [
            'Service started successfully',
            'New agent registered',
            'Configuration reloaded',
            'Backup completed',
            'User logged in successfully'
        ],
        debug: [
            'Processing request from 192.168.1.x',
            'Cache hit for resource',
            'Query executed in 45ms',
            'WebSocket connection established',
            'Heartbeat received from agent'
        ]
    };

    const logs = [];
    const now = Date.now();

    for (let i = 0; i < 50; i++) {
        const level = levels[Math.floor(Math.random() * (i < 5 ? 2 : levels.length))];
        const source = sources[Math.floor(Math.random() * sources.length)];
        const agent = agents[Math.floor(Math.random() * agents.length)];
        const msgs = messages[level];
        const message = msgs[Math.floor(Math.random() * msgs.length)];

        logs.push({
            id: `log-${i}`,
            timestamp: new Date(now - i * 60000 * Math.random() * 10).toISOString(),
            level,
            source,
            agent: agent.name,
            ip: agent.ip,
            message: `[${source}] ${message}`
        });
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export async function GET() {
    try {
        // In production, fetch from Loki or log aggregator
        // const lokiUrl = process.env.LOKI_URL || 'http://192.168.1.206:3100';
        // const response = await fetch(`${lokiUrl}/loki/api/v1/query_range?query={job="soc"}`);

        const logs = generateMockLogs();

        return NextResponse.json({
            success: true,
            total: logs.length,
            logs
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            logs: []
        });
    }
}
