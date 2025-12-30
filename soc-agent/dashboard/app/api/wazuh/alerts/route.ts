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

        // Return empty array when Wazuh is not available
        return NextResponse.json({
            success: false,
            error: error.message,
            alerts: [],
            message: 'Cannot connect to Wazuh Manager. Install agents to start receiving alerts.'
        });
    }
}
