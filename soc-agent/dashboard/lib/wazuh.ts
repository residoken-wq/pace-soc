// Wazuh API Client with JWT Authentication
// Handles self-signed SSL certificates for Next.js 14+

// CRITICAL: Disable SSL verification globally for this process
// This is required for self-signed certificates on internal Wazuh servers
// In production, consider using proper CA-signed certificates
if (process.env.NODE_ENV !== 'test') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const WAZUH_MANAGER_URL = process.env.WAZUH_MANAGER_URL || 'https://192.168.1.206:55000';
const WAZUH_API_USER = process.env.WAZUH_API_USER || 'wazuh-wui';
const WAZUH_API_PASSWORD = process.env.WAZUH_API_PASSWORD;

// Validate required environment variables
if (!WAZUH_API_PASSWORD) {
    console.warn('[SECURITY] WAZUH_API_PASSWORD not set in environment variables!');
}

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getWazuhToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (cachedToken && Date.now() < tokenExpiry - 60000) {
        return cachedToken;
    }

    try {
        const credentials = Buffer.from(`${WAZUH_API_USER}:${WAZUH_API_PASSWORD}`).toString('base64');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${WAZUH_MANAGER_URL}/security/user/authenticate`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            },
            signal: controller.signal,
            cache: 'no-store'
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Auth failed: ${response.status}`);
        }

        const data = await response.json();
        cachedToken = data.data.token;
        // Wazuh tokens typically last 900 seconds (15 min)
        tokenExpiry = Date.now() + 900000;

        return cachedToken!;
    } catch (error) {
        console.error('Wazuh Auth Error:', error);
        throw error;
    }
}

// Response cache to reduce API calls
const responseCache: Map<string, { data: any; expiry: number }> = new Map();
const CACHE_TTL = 30000; // 30 seconds cache

export async function wazuhFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const cacheKey = `${options.method || 'GET'}:${endpoint}`;

    // Return cached response if valid (only for GET requests)
    if (options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
        const cached = responseCache.get(cacheKey);
        if (cached && Date.now() < cached.expiry) {
            return cached.data;
        }
    }

    const token = await getWazuhToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${WAZUH_MANAGER_URL}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        },
        signal: controller.signal,
        cache: 'no-store'
    });

    clearTimeout(timeoutId);

    // Handle rate limiting - wait and retry once
    if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return wazuhFetch(endpoint, options); // Retry once
    }

    if (!response.ok) {
        throw new Error(`Wazuh API Error: ${response.status}`);
    }

    const data = await response.json();

    // Cache successful responses
    responseCache.set(cacheKey, { data, expiry: Date.now() + CACHE_TTL });

    return data;
}

export { WAZUH_MANAGER_URL };

