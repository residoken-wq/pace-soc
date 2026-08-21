export const APPLICATION_ROLES = [
    'uem_admin',
    'asset_manager',
    'support',
    'security_viewer',
    'auditor'
] as const;

export type ApplicationRole = typeof APPLICATION_ROLES[number];

/**
 * Claims entering this module must already have a cryptographically verified
 * signature from the approved OIDC adapter. This module validates application
 * context and maps trusted group claims; it does not verify JWT signatures.
 */
export interface VerifiedOidcClaims {
    iss?: unknown;
    aud?: unknown;
    sub?: unknown;
    exp?: unknown;
    iat?: unknown;
    nbf?: unknown;
    preferred_username?: unknown;
    groups?: unknown;
    [claim: string]: unknown;
}

export interface IdentityConfiguration {
    issuer: string;
    audience: string;
    groupRoleMapping: Record<string, ApplicationRole>;
    usernameClaim?: string;
    groupsClaim?: string;
    clockSkewSeconds?: number;
}

export interface IdentityContext {
    subject: string;
    username: string;
    issuer: string;
    audience: string;
    groups: string[];
    roles: ApplicationRole[];
}

export class IdentityValidationError extends Error {
    public readonly code:
        | 'invalid-configuration'
        | 'invalid-issuer'
        | 'invalid-audience'
        | 'expired'
        | 'not-yet-valid'
        | 'invalid-subject'
        | 'invalid-username'
        | 'invalid-groups';

    constructor(code: IdentityValidationError['code'], message: string) {
        super(message);
        this.name = 'IdentityValidationError';
        this.code = code;
    }
}

function requiredConfiguration(value: string, field: string): string {
    const normalized = value.trim();
    if (!normalized) {
        throw new IdentityValidationError('invalid-configuration', `${field} must not be empty`);
    }
    return normalized;
}

function numericDate(value: unknown, field: 'exp' | 'iat' | 'nbf'): number | undefined {
    if (value === undefined) return undefined;
    if (!Number.isInteger(value)) {
        throw new IdentityValidationError(
            field === 'exp' ? 'expired' : 'not-yet-valid',
            `${field} must be an integer NumericDate`
        );
    }
    return value as number;
}

function audienceValues(value: unknown): string[] {
    if (typeof value === 'string' && value) return [value];
    if (Array.isArray(value) && value.every(entry => typeof entry === 'string' && entry)) {
        return value;
    }
    return [];
}

function claimString(claims: VerifiedOidcClaims, claimName: string): string | undefined {
    const value = claims[claimName];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function claimGroups(claims: VerifiedOidcClaims, claimName: string): string[] {
    const value = claims[claimName];
    if (value === undefined) return [];
    if (!Array.isArray(value) || !value.every(group => typeof group === 'string' && group.trim())) {
        throw new IdentityValidationError('invalid-groups', `${claimName} must be an array of strings`);
    }
    return Array.from(new Set(value.map(group => group.trim())));
}

function normalizedGroupRoleMapping(
    mapping: Record<string, ApplicationRole>
): Map<string, ApplicationRole> {
    const normalized = new Map<string, ApplicationRole>();

    for (const [group, role] of Object.entries(mapping)) {
        const groupKey = group.trim().toLowerCase();
        if (!groupKey || !APPLICATION_ROLES.includes(role)) {
            throw new IdentityValidationError('invalid-configuration', 'group role mapping is invalid');
        }
        const existing = normalized.get(groupKey);
        if (existing && existing !== role) {
            throw new IdentityValidationError(
                'invalid-configuration',
                `group ${group} maps to conflicting roles`
            );
        }
        normalized.set(groupKey, role);
    }

    return normalized;
}

export function identityFromVerifiedClaims(
    claims: VerifiedOidcClaims,
    configuration: IdentityConfiguration,
    nowEpochSeconds = Math.floor(Date.now() / 1000)
): IdentityContext {
    const issuer = requiredConfiguration(configuration.issuer, 'issuer');
    const audience = requiredConfiguration(configuration.audience, 'audience');
    const clockSkew = configuration.clockSkewSeconds ?? 60;
    if (!Number.isInteger(clockSkew) || clockSkew < 0 || clockSkew > 300) {
        throw new IdentityValidationError(
            'invalid-configuration',
            'clock skew must be an integer between 0 and 300 seconds'
        );
    }

    if (claims.iss !== issuer) {
        throw new IdentityValidationError('invalid-issuer', 'token issuer does not match');
    }
    if (!audienceValues(claims.aud).includes(audience)) {
        throw new IdentityValidationError('invalid-audience', 'token audience does not include this API');
    }

    const expiration = numericDate(claims.exp, 'exp');
    const issuedAt = numericDate(claims.iat, 'iat');
    const notBefore = numericDate(claims.nbf, 'nbf');
    if (expiration === undefined || expiration <= nowEpochSeconds - clockSkew) {
        throw new IdentityValidationError('expired', 'token is expired or has no expiration');
    }
    if (issuedAt !== undefined && issuedAt > nowEpochSeconds + clockSkew) {
        throw new IdentityValidationError('not-yet-valid', 'token issued-at time is in the future');
    }
    if (notBefore !== undefined && notBefore > nowEpochSeconds + clockSkew) {
        throw new IdentityValidationError('not-yet-valid', 'token is not active yet');
    }

    const subject = typeof claims.sub === 'string' ? claims.sub.trim() : '';
    if (!subject) {
        throw new IdentityValidationError('invalid-subject', 'token subject is missing');
    }

    const usernameClaim = configuration.usernameClaim || 'preferred_username';
    const username = claimString(claims, usernameClaim);
    if (!username) {
        throw new IdentityValidationError('invalid-username', `${usernameClaim} is missing`);
    }

    const groupsClaim = configuration.groupsClaim || 'groups';
    const groups = claimGroups(claims, groupsClaim);
    const mapping = normalizedGroupRoleMapping(configuration.groupRoleMapping);
    const mappedRoles = new Set<ApplicationRole>();
    for (const group of groups) {
        const role = mapping.get(group.toLowerCase());
        if (role) mappedRoles.add(role);
    }
    const roles = APPLICATION_ROLES.filter(role => mappedRoles.has(role));

    return { subject, username, issuer, audience, groups, roles };
}

export function hasAnyRequiredRole(
    identity: IdentityContext,
    requiredRoles: readonly ApplicationRole[]
): boolean {
    return requiredRoles.some(role => identity.roles.includes(role));
}
