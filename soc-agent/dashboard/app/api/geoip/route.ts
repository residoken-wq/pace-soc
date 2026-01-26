import { NextRequest, NextResponse } from 'next/server';

// Mock GeoIP Data
// In a real implementation, this would query Elasticsearch/Wazuh for distinct source IPs
// and look them up in a GeoIP database (like MaxMind).
const MOCK_GEO_STATS = [
    { country: "Vietnam", code: "VN", count: 145, lat: 14.0583, lon: 108.2772 },
    { country: "China", code: "CN", count: 89, lat: 35.8617, lon: 104.1954 },
    { country: "United States", code: "US", count: 64, lat: 37.0902, lon: -95.7129 },
    { country: "Russia", code: "RU", count: 42, lat: 61.5240, lon: 105.3188 },
    { country: "Brazil", code: "BR", count: 23, lat: -14.2350, lon: -51.9253 },
    { country: "Germany", code: "DE", count: 18, lat: 51.1657, lon: 10.4515 },
    { country: "India", code: "IN", count: 15, lat: 20.5937, lon: 78.9629 },
    { country: "France", code: "FR", count: 12, lat: 46.2276, lon: 2.2137 },
    { country: "Japan", code: "JP", count: 8, lat: 36.2048, lon: 138.2529 },
    { country: "United Kingdom", code: "GB", count: 7, lat: 55.3781, lon: -3.4360 },
];

export async function GET(request: NextRequest) {
    try {
        // Simulate database delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Randomize counts slightly to show "live" activity
        const data = MOCK_GEO_STATS.map(item => ({
            ...item,
            count: Math.max(0, item.count + Math.floor(Math.random() * 10 - 2))
        })).sort((a, b) => b.count - a.count);

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch GeoIP stats' }, { status: 500 });
    }
}
