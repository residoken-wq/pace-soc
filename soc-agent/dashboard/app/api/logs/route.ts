import { NextResponse } from 'next/server';
import { wazuhFetch } from '../../../lib/wazuh';

interface LogEntry {
    id: string;
    timestamp: string;
    level: 'error' | 'warn' | 'info' | 'debug';
    source: string;
    agent: string;
    ip: string;
    message: string;
    ruleId?: string;
    ruleLevel?: number;
}

// Map log level string to our enum
function getLogLevel(level: string): 'error' | 'warn' | 'info' | 'debug' {
    const upper = level?.toUpperCase() || '';
    if (upper === 'CRITICAL' || upper === 'ERROR') return 'error';
    if (upper === 'WARNING') return 'warn';
    if (upper === 'INFO') return 'info';
    return 'debug';
}

// Map numeric rule level to log level
function getRuleLevelToLogLevel(ruleLevel: number): 'error' | 'warn' | 'info' | 'debug' {
    if (ruleLevel >= 12) return 'error';
    if (ruleLevel >= 7) return 'warn';
    if (ruleLevel >= 4) return 'info';
    return 'debug';
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '100');
        const levelFilter = searchParams.get('level');
        const sourceFilter = searchParams.get('source');
        const search = searchParams.get('search');

        let logs: LogEntry[] = [];

        // 1. Get Manager Logs (main source)
        try {
            const logsData = await wazuhFetch('/manager/logs?limit=500&sort=-timestamp');

            if (logsData.data?.affected_items) {
                logs = logsData.data.affected_items.map((log: any, index: number) => ({
                    id: `mlog-${index}`,
                    timestamp: log.timestamp,
                    level: getLogLevel(log.level),
                    source: log.tag || 'wazuh-manager',
                    agent: 'wazuh-manager',
                    ip: '127.0.0.1',
                    message: log.description || log.tag || 'No description',
                    ruleLevel: log.level === 'CRITICAL' ? 15 : log.level === 'ERROR' ? 12 : log.level === 'WARNING' ? 7 : 3
                }));
            }
        } catch (e) {
            console.log('Manager logs not available');
        }

        // 2. Get Agent Logs from active agents
        try {
            const agentsData = await wazuhFetch('/agents?status=active&limit=20');
            const activeAgents = agentsData.data?.affected_items || [];

            for (const agent of activeAgents) {
                if (agent.id === '000') continue; // Skip manager

                // Try syscheck for file changes
                try {
                    const syscheckData = await wazuhFetch(`/syscheck/${agent.id}?limit=20&sort=-date`);
                    if (syscheckData.data?.affected_items) {
                        const syscheckLogs = syscheckData.data.affected_items.map((item: any, idx: number) => ({
                            id: `syscheck-${agent.id}-${idx}`,
                            timestamp: item.date || new Date().toISOString(),
                            level: item.event === 'deleted' ? 'error' : item.event === 'modified' ? 'warn' : 'info',
                            source: 'syscheck',
                            agent: agent.name,
                            ip: agent.ip || '-',
                            message: `[syscheck] File ${item.event}: ${item.file}`,
                            ruleLevel: item.event === 'deleted' ? 12 : 7
                        }));
                        logs = [...logs, ...syscheckLogs];
                    }
                } catch (e) { /* continue */ }
            }
        } catch (e) {
            console.log('Agents data not available');
        }

        // Apply filters
        let filtered = logs;

        // Level filter
        if (levelFilter && levelFilter !== 'all') {
            filtered = filtered.filter(log => log.level === levelFilter);
        }

        // Source filter
        if (sourceFilter && sourceFilter !== 'all') {
            filtered = filtered.filter(log => log.source.toLowerCase().includes(sourceFilter.toLowerCase()));
        }

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(log =>
                log.message.toLowerCase().includes(searchLower) ||
                log.agent.toLowerCase().includes(searchLower) ||
                log.source.toLowerCase().includes(searchLower)
            );
        }

        // Sort by timestamp desc
        filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return NextResponse.json({
            success: true,
            total: filtered.length,
            source: 'wazuh-manager',
            logs: filtered.slice(0, limit)
        });

    } catch (error: any) {
        console.error('Logs API Error:', error.message);

        return NextResponse.json({
            success: false,
            error: error.message,
            source: 'error',
            total: 0,
            logs: [],
            message: 'Cannot connect to Wazuh Manager. Please check connection settings.'
        });
    }
}
