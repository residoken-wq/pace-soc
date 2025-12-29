// Wazuh API Client with JWT Authentication
// Default credentials: wazuh-wui / wazuh-wui

const WAZUH_MANAGER_URL = process.env.WAZUH_MANAGER_URL || 'https://192.168.1.206:55000';
const WAZUH_API_USER = process.env.WAZUH_API_USER || 'wazuh-wui';
const WAZUH_API_PASSWORD = process.env.WAZUH_API_PASSWORD || 'wazuh-wui';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getWazuhToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (cachedToken && Date.now() < tokenExpiry - 60000) {
        return cachedToken;
    }

    try {
        const credentials = Buffer.from(`${WAZUH_API_USER}:${WAZUH_API_PASSWORD}`).toString('base64');

        const response = await fetch(`${WAZUH_MANAGER_URL}/security/user/authenticate`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json'
            },
            // Skip SSL verification for self-signed certs (common in Wazuh)
            // @ts-ignore - Next.js specific option
            next: { revalidate: 0 }
        });

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

export async function wazuhFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await getWazuhToken();

    const response = await fetch(`${WAZUH_MANAGER_URL}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        throw new Error(`Wazuh API Error: ${response.status}`);
    }

    return response.json();
}

export { WAZUH_MANAGER_URL };
