import { NextResponse } from 'next/server';
import { wazuhFetch } from '../../../../lib/wazuh';

const WAZUH_INDEXER_URL = process.env.WAZUH_INDEXER_URL || 'https://192.168.1.206:9200';
const WAZUH_INDEXER_USER = process.env.WAZUH_INDEXER_USER || 'admin';
const WAZUH_INDEXER_PASSWORD = process.env.WAZUH_INDEXER_PASSWORD || process.env.WAZUH_API_PASSWORD;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get('agentId');

        // 1. Fetch real-time metrics from Wazuh Indexer (alerts with rule.id 100010)
        const realMetrics: Record<string, any> = {};
        try {
            const query = {
                size: 200,
                sort: [{ "@timestamp": "desc" }],
                query: {
                    bool: {
                        must: [
                            { match: { "rule.id": "100010" } }
                        ]
                    }
                }
            };

            const indexerRes = await fetch(`${WAZUH_INDEXER_URL}/wazuh-alerts-*/_search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(WAZUH_INDEXER_PASSWORD ? { 'Authorization': 'Basic ' + Buffer.from(`${WAZUH_INDEXER_USER}:${WAZUH_INDEXER_PASSWORD}`).toString('base64') } : {})
                },
                body: JSON.stringify(query)
            });

            if (indexerRes.ok) {
                const data = await indexerRes.json();
                const hits = data.hits?.hits || [];

                // Process hits to get latest metric per agent
                hits.forEach((hit: any) => {
                    const source = hit._source;
                    const aId = source.agent?.id;
                    // Only keep the most recent one (hits are sorted desc)
                    if (aId && !realMetrics[aId]) {
                        // Extract metrics from full_log or decoded fields
                        // Our decoder outputs: cpu, memory, storage
                        // If fields are extracted:
                        const cpu = parseFloat(source.data?.cpu || source.data?.soc_metrics?.cpu || 0);
                        const memory = parseFloat(source.data?.memory || source.data?.soc_metrics?.memory || 0);
                        const storage = parseFloat(source.data?.storage || source.data?.soc_metrics?.storage || 0);

                        realMetrics[aId] = { cpu, memory, storage };
                    }
                });
            }
        } catch (e) {
            console.error('Indexer fetch failed, falling back to syscollector:', e);
        }

        // 2. Fetch active agents list
        if (agentId) {
            // Single agent flow
            const m = realMetrics[agentId] || await getAgentMetrics(agentId);
            return NextResponse.json({ success: true, metrics: m });
        }

        const agentsData = await wazuhFetch('/agents?status=active&limit=50');
        const agents = agentsData.data?.affected_items || [];

        const metricsPromises = agents.map(async (agent: any) => {
            // Use real metrics if available, otherwise estimate
            if (realMetrics[agent.id]) {
                return {
                    agentId: agent.id,
                    agentName: agent.name,
                    agentIp: agent.ip,
                    ...realMetrics[agent.id],
                    source: 'real-time'
                };
            }

            try {
                const estimated = await getAgentMetrics(agent.id);
                return {
                    agentId: agent.id,
                    agentName: agent.name,
                    agentIp: agent.ip,
                    ...estimated,
                    source: 'estimated'
                };
            } catch (e) {
                return {
                    agentId: agent.id,
                    agentName: agent.name,
                    agentIp: agent.ip,
                    cpu: 0, memory: 0, storage: 0,
                    error: 'Unable to fetch metrics'
                };
            }
        });

        const allMetrics = await Promise.all(metricsPromises);

        return NextResponse.json({
            success: true,
            metrics: allMetrics
        });
    } catch (error: any) {
        console.error('Syscollector Metrics Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            metrics: []
        });
    }
}

async function getAgentMetrics(agentId: string) {
    // ... (Keep existing estimation logic as fallback)
    const cpu = 0;
    let memory = 0;
    let storage = 0;

    // We only reach here if Indexer failed or no data for this agent yet
    // Try fairly reliable sources first
    try {
        const osData = await wazuhFetch(`/syscollector/${agentId}/os`);
        if (osData.data?.affected_items?.[0]) {
            const os = osData.data.affected_items[0];
            const totalMem = os.ram_total || os.total_memory || 0;
            const freeMem = os.ram_free || os.free_memory || 0;
            if (totalMem > 0) memory = Math.round(((totalMem - freeMem) / totalMem) * 100);
        }
    } catch (e) { }

    // Try to get storage from hardware when available; never fabricate telemetry.
    try {
        const hwData = await wazuhFetch(`/syscollector/${agentId}/hardware`);
        if (hwData.data?.affected_items?.[0]) {
            const hw = hwData.data.affected_items[0];
            // Some syscollector returns disk info
            if (hw.disk_total && hw.disk_free) {
                storage = Math.round(((hw.disk_total - hw.disk_free) / hw.disk_total) * 100);
            }
        }
    } catch (e) { }

    try {
        // Process inventory is not a CPU measurement; do not turn it into a fake percentage.
        const processData = await wazuhFetch(`/syscollector/${agentId}/processes?limit=100`);
        void processData;
    } catch (e) { }

    return {
        cpu,
        memory,
        storage: storage
    };
}
