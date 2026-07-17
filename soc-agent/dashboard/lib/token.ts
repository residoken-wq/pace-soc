import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_TTL_SECONDS = 60 * 60;
const MIN_SECRET_LENGTH = 32;

export type UserRole = 'admin' | 'analyst';

export interface TokenPayload {
    username: string;
    role: UserRole;
    name: string;
    iat: number;
    exp: number;
}

function getJwtSecret(): string | null {
    const secret = process.env.JWT_SECRET;
    return secret && secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

function encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signatureFor(input: string, secret: string): Buffer {
    return createHmac('sha256', secret).update(input).digest();
}

export function isJwtConfigured(): boolean {
    return getJwtSecret() !== null;
}

export function createToken(username: string, role: UserRole, name: string): string {
    const secret = getJwtSecret();
    if (!secret) {
        throw new Error('JWT_SECRET must be configured with at least 32 characters');
    }

    const now = Math.floor(Date.now() / 1000);
    const header = encode({ alg: 'HS256', typ: 'JWT' });
    const payload = encode({
        username,
        role,
        name,
        iat: now,
        exp: now + TOKEN_TTL_SECONDS
    } satisfies TokenPayload);
    const input = `${header}.${payload}`;
    const signature = signatureFor(input, secret).toString('base64url');

    return `${input}.${signature}`;
}

export function validateToken(token: string): TokenPayload | null {
    const secret = getJwtSecret();
    if (!secret) return null;

    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [headerPart, payloadPart, signaturePart] = parts;
        const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8'));
        if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;

        const supplied = Buffer.from(signaturePart, 'base64url');
        const expected = signatureFor(`${headerPart}.${payloadPart}`, secret);
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

        const payload = JSON.parse(
            Buffer.from(payloadPart, 'base64url').toString('utf8')
        ) as TokenPayload;
        const now = Math.floor(Date.now() / 1000);

        if (!payload.username || !payload.name) return null;
        if (payload.role !== 'admin' && payload.role !== 'analyst') return null;
        if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)) return null;
        if (payload.iat > now + 60 || payload.exp <= now || payload.exp - payload.iat > TOKEN_TTL_SECONDS) return null;

        return payload;
    } catch {
        return null;
    }
}
