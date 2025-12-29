
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Connect to Node Exporter via host gateway
    const response = await fetch('http://host.docker.internal:9100/metrics', {
        next: { revalidate: 5 } // Cache for 5s
    });

    if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 502 });
    }

    const text = await response.text();
    const metrics = parsePrometheusMetrics(text);
    
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Metrics Fetch Error:", error);
    // Fallback for dev/local testing where host.docker.internal might fail or NE is missing
    return NextResponse.json(
        { cpu: 0, ram: 0, disk: 0, error: 'Connection refused' }, 
        { status: 200 } // Return 200 with 0s to prevent UI crash, but indicate error
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
        }
    };
}
