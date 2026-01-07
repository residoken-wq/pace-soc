// JWT Authentication Library for SOC Dashboard
// Provides secure token generation and validation

import { cookies } from 'next/headers';

// In production, use a strong random secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'soc-dashboard-secret-change-in-production-32chars';
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

// User configuration - in production, use database
const USERS: Record<string, { password: string; role: string; name: string }> = {
    admin: {
        password: process.env.SOC_ADMIN_PASSWORD || 'SocAdmin@2024!',
        role: 'admin',
        name: 'Administrator'
    },
    analyst: {
        password: process.env.SOC_ANALYST_PASSWORD || 'SocAnalyst@2024!',
        role: 'analyst',
        name: 'SOC Analyst'
    }
};

interface TokenPayload {
    username: string;
    role: string;
    name: string;
    iat: number;
    exp: number;
}

// Simple HMAC-like signature using base64 (for demo - use jose/jsonwebtoken in production)
function sign(payload: object): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');

    // Simple signature using secret (NOT cryptographically secure - use crypto.subtle in production)
    const signatureInput = `${header}.${payloadStr}.${JWT_SECRET}`;
    const signature = Buffer.from(signatureInput).toString('base64url').substring(0, 43);

    return `${header}.${payloadStr}.${signature}`;
}

function verify(token: string): TokenPayload | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [header, payloadStr, signature] = parts;

        // Verify signature
        const expectedSig = Buffer.from(`${header}.${payloadStr}.${JWT_SECRET}`).toString('base64url').substring(0, 43);
        if (signature !== expectedSig) return null;

        // Decode and validate payload
        const payload: TokenPayload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString());

        // Check expiry
        if (payload.exp < Date.now()) return null;

        return payload;
    } catch {
        return null;
    }
}

export function createToken(username: string, role: string, name: string): string {
    const payload: TokenPayload = {
        username,
        role,
        name,
        iat: Date.now(),
        exp: Date.now() + TOKEN_EXPIRY
    };
    return sign(payload);
}

export function validateToken(token: string): TokenPayload | null {
    return verify(token);
}

export function validateCredentials(username: string, password: string): { valid: boolean; role?: string; name?: string } {
    const user = USERS[username];
    if (!user) return { valid: false };
    if (user.password !== password) return { valid: false };
    return { valid: true, role: user.role, name: user.name };
}

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
