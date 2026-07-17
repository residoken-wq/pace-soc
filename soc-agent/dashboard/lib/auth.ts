// JWT Authentication Library for SOC Dashboard
// Provides secure token generation and validation

import { cookies } from 'next/headers';
import { createToken, TokenPayload, UserRole, validateToken } from './token';

// User configuration - in production, use database
const USERS: Record<string, { password?: string; role: UserRole; name: string }> = {
    admin: {
        password: process.env.SOC_ADMIN_PASSWORD,
        role: 'admin',
        name: 'Administrator'
    },
    analyst: {
        password: process.env.SOC_ANALYST_PASSWORD,
        role: 'analyst',
        name: 'SOC Analyst'
    }
};

export function validateCredentials(username: string, password: string): { valid: boolean; role?: UserRole; name?: string } {
    const user = USERS[username];
    if (!user || !user.password) return { valid: false };
    if (user.password !== password) return { valid: false };
    return { valid: true, role: user.role, name: user.name };
}

export { createToken, validateToken };
export type { TokenPayload, UserRole };

export async function getSessionUser(): Promise<TokenPayload | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('soc_auth')?.value;
        if (!token) return null;
        return validateToken(token);
    } catch {
        return null;
    }
}

export function isAuthenticated(token: string | undefined): boolean {
    if (!token) return false;
    return validateToken(token) !== null;
}

// Allowed agent IPs for metrics fetching (SSRF prevention)
export const ALLOWED_AGENT_IPS = [
    '127.0.0.1',
    'localhost',
    '192.168.0.',    // Local network prefix
    '192.168.1.',    // Local network prefix
    '10.0.',         // Private network
    '172.16.',       // Private network
];

export function isAllowedAgentIp(ip: string): boolean {
    // Block cloud metadata endpoints (SSRF protection)
    const blockedPatterns = [
        '169.254.',     // AWS metadata
        'metadata.',    // GCP metadata
        '100.100.',     // Alibaba Cloud
    ];

    if (blockedPatterns.some(p => ip.includes(p))) return false;

    // Allow local and private networks only
    return ALLOWED_AGENT_IPS.some(prefix => ip.startsWith(prefix));
}
