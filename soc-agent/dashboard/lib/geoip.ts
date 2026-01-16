// GeoIP lookup service
// Uses ip-api.com free tier (45 req/min) for geographic IP lookup

interface GeoIPResult {
    ip: string;
    country: string;
    countryCode: string;
    city: string;
    region: string;
    lat: number;
    lon: number;
    isp: string;
    org: string;
    isPrivate: boolean;
}

// Cache for GeoIP results (in-memory, reset on server restart)
const geoCache = new Map<string, GeoIPResult>();

// Private IP ranges
const PRIVATE_RANGES = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/
];

function isPrivateIP(ip: string): boolean {
    return PRIVATE_RANGES.some(regex => regex.test(ip));
}

export async function lookupGeoIP(ip: string): Promise<GeoIPResult> {
    // Check cache first
    if (geoCache.has(ip)) {
        return geoCache.get(ip)!;
    }

    // Handle private IPs
    if (isPrivateIP(ip) || ip === '-') {
        const result: GeoIPResult = {
            ip,
            country: 'Private Network',
            countryCode: 'LAN',
            city: 'Local',
            region: '',
            lat: 0,
            lon: 0,
            isp: 'Local Network',
            org: '',
            isPrivate: true
        };
        geoCache.set(ip, result);
        return result;
    }

    try {
        // Use ip-api.com (free, 45 requests/minute)
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,lat,lon,isp,org`);

        if (!response.ok) {
            throw new Error('GeoIP lookup failed');
        }

        const data = await response.json();

        if (data.status === 'fail') {
            throw new Error(data.message || 'GeoIP lookup failed');
        }

        const result: GeoIPResult = {
            ip,
            country: data.country || 'Unknown',
            countryCode: data.countryCode || '??',
            city: data.city || '',
            region: data.regionName || '',
            lat: data.lat || 0,
            lon: data.lon || 0,
            isp: data.isp || '',
            org: data.org || '',
            isPrivate: false
        };

        // Cache result
        geoCache.set(ip, result);
        return result;

    } catch (error) {
        console.error('GeoIP lookup error:', error);

        const result: GeoIPResult = {
            ip,
            country: 'Unknown',
            countryCode: '??',
            city: '',
            region: '',
            lat: 0,
            lon: 0,
            isp: '',
            org: '',
            isPrivate: false
        };
        geoCache.set(ip, result);
        return result;
    }
}

// Batch lookup for multiple IPs
export async function batchLookupGeoIP(ips: string[]): Promise<Map<string, GeoIPResult>> {
    const results = new Map<string, GeoIPResult>();
    const uniqueIps = [...new Set(ips.filter(ip => ip && ip !== '-'))];

    // Lookup each IP (with rate limiting consideration)
    for (const ip of uniqueIps) {
        results.set(ip, await lookupGeoIP(ip));
    }

    return results;
}

// Get country flag emoji from country code
export function getCountryFlag(countryCode: string): string {
    if (!countryCode || countryCode === '??' || countryCode === 'LAN') {
        return '🏠';
    }

    // Convert country code to flag emoji
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));

    return String.fromCodePoint(...codePoints);
}

export type { GeoIPResult };
