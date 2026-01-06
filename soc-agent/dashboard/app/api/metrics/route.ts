
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        // Check for agent IP query parameter
        const { searchParams } = new URL(request.url);
        const agentIp = searchParams.get('agentIp');

        // Determine metrics source URL
        let metricsUrl = 'http://host.docker.internal:9100/metrics'; // Default: local

        if (agentIp && agentIp !== '127.0.0.1' && agentIp !== 'localhost') {
            // Fetch from remote agent's Node Exporter
            metricsUrl = `http://${agentIp}:9100/metrics`;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const response = await fetch(metricsUrl, {
            signal: controller.signal,
            next: { revalidate: 0 } // No cache for real-time
        });

        clearTimeout(timeout);

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch metrics', source: metricsUrl }, { status: 502 });
        }

        const text = await response.text();
        const metrics = parsePrometheusMetrics(text);

        return NextResponse.json({ ...metrics, source: agentIp || 'local' });
    } catch (error: any) {
        console.error("Metrics Fetch Error:", error?.message);
        // Fallback with error indicator
        return NextResponse.json(
            { cpu: { total: 0, idle: 0 }, ram: { percent: 0 }, disk: { percent: 0 }, network: { total: 0 }, error: error?.message || 'Connection failed' },
            { status: 200 }
        );
    }
}

function parsePrometheusMetrics(text: string) {
    // Simple parser for standard Node Exporter metrics
    const lines = text.split('\n');
    let cpuUser = 0;
    let cpuSystem = 0;
    let cpuIdle = 0;
    let memTotal = 0;
    let memFree = 0;
    let memBuffers = 0;
    let memCached = 0;

    // Helper to extract value
    const getVal = (line: string) => parseFloat(line.split(' ')[1]);

    lines.forEach(line => {
        if (line.startsWith('#')) return;

        // CPU (Aggregate if multiple cores, simplifying here for total)
        // node_cpu_seconds_total{cpu="0",mode="idle"} 1234.56
        if (line.startsWith('node_cpu_seconds_total')) {
            if (line.includes('mode="user"')) cpuUser += getVal(line);
            if (line.includes('mode="system"')) cpuSystem += getVal(line);
            if (line.includes('mode="idle"')) cpuIdle += getVal(line);
        }

        // Memory
        if (line.startsWith('node_memory_MemTotal_bytes')) memTotal = getVal(line);
        if (line.startsWith('node_memory_MemFree_bytes')) memFree = getVal(line);
        if (line.startsWith('node_memory_Buffers_bytes')) memBuffers = getVal(line);
        if (line.startsWith('node_memory_Cached_bytes')) memCached = getVal(line);
    });

    // Calculate Percentages
    const cpuTotal = cpuUser + cpuSystem + cpuIdle;
    // Note: CPU is cumulative counters. To get % usage, we need delta. 
    // This simple proxy just returns raw counters? 
    // No, for a stateless API, we can't calculate delta easily without DB.
    // OPTION: Returns counters, Frontend calculates speed? Or Frontend polls and diffs?
    // Let's return counters and let frontend handle diff, OR standard Instant calculation if possible.
    // Actually, getting Instant % from Node Exporter requires rate() query which PromQL does. 
    // Without Prometheus, we have to diff ourselves.
    // Simplified approach: Return counters.

    // Memory is easier (gauges)
    const memUsed = memTotal - memFree - memBuffers - memCached;
    const ramPercent = memTotal > 0 ? (memUsed / memTotal) * 100 : 0;

    // Disk (Root /)
    let diskTotal = 0;
    let diskFree = 0;

    // Network (Total Bytes)
    let netRx = 0;
    let netTx = 0;

    lines.forEach(line => {
        if (line.startsWith('#')) return;

        // Disk (look for root mountpoint)
        // node_filesystem_size_bytes{device="/dev/sda1",fstype="ext4",mountpoint="/"}
        if (line.includes('mountpoint="/"') || line.includes('mountpoint="/etc/hosts"')) { // Docker often mounts /etc/hosts, use root generally
            if (line.startsWith('node_filesystem_size_bytes')) diskTotal = Math.max(diskTotal, getVal(line));
            if (line.startsWith('node_filesystem_avail_bytes')) diskFree = Math.max(diskFree, getVal(line));
        }

        // Network (Sum of all non-lo interfaces)
        // node_network_receive_bytes_total{device="eth0"}
        if (!line.includes('device="lo"')) {
            if (line.startsWith('node_network_receive_bytes_total')) netRx += getVal(line);
            if (line.startsWith('node_network_transmit_bytes_total')) netTx += getVal(line);
        }
    });

    const diskUsed = diskTotal - diskFree;
    const diskPercent = diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0;

    return {
        cpu: {
            user: cpuUser,
            system: cpuSystem,
            idle: cpuIdle,
            total: cpuTotal
        },
        ram: {
            total: memTotal,
            used: memUsed,
            percent: Math.round(ramPercent * 10) / 10
        },
        disk: {
            total: diskTotal,
            used: diskUsed,
            percent: Math.round(diskPercent * 10) / 10
        },
        network: {
            rx: netRx,
            tx: netTx,
            total: netRx + netTx
        }
    };
}
