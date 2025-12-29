import { NextResponse } from 'next/server';
import { wazuhFetch } from '../../../../lib/wazuh';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') || '50';

        const data = await wazuhFetch(`/alerts?limit=${limit}&sort=-timestamp`);

        const alerts = data.data.affected_items.map((alert: any) => ({
            id: alert._id,
            timestamp: alert.timestamp,
            rule: {
                id: alert.rule?.id,
                level: alert.rule?.level,
                description: alert.rule?.description
            },
            agent: {
                id: alert.agent?.id,
                name: alert.agent?.name,
                ip: alert.agent?.ip
            },
            location: alert.location,
            fullLog: alert.full_log
        }));

        return NextResponse.json({
            success: true,
            total: data.data.total_affected_items,
            alerts
        });
    } catch (error: any) {
        console.error('Wazuh Alerts Error:', error);

        // Return mock data for development/fallback
        return NextResponse.json({
            success: false,
            error: error.message,
            alerts: [
                {
                    id: 'mock-1',
                    timestamp: new Date().toISOString(),
                    rule: { id: '5710', level: 10, description: 'SSH Authentication Failure' },
                    agent: { id: '001', name: 'soc-agent-container', ip: '192.168.1.206' },
                    location: '/var/log/auth.log'
                },
                {
                    id: 'mock-2',
                    timestamp: new Date(Date.now() - 300000).toISOString(),
                    rule: { id: '550', level: 5, description: 'File modified in monitored directory' },
                    agent: { id: '002', name: 'web-server-01', ip: '192.168.1.100' },
                    location: '/var/ossec/logs/alerts/alerts.json'
                }
            ]
        });
    }
}
