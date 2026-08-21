import assert from 'node:assert/strict';
import test from 'node:test';

import {
    hasAnyRequiredRole,
    identityFromVerifiedClaims,
    IdentityValidationError,
    type IdentityConfiguration,
    type VerifiedOidcClaims
} from '../src/identity/authorization.ts';

const NOW = 1_800_000_000;
const configuration: IdentityConfiguration = {
    issuer: 'https://identity.example.test/realms/pace',
    audience: 'pace-uem-api',
    clockSkewSeconds: 30,
    groupRoleMapping: {
        'CN=UEM-Admins,OU=Groups,DC=pace,DC=edu,DC=vn': 'uem_admin',
        'CN=Asset-Managers,OU=Groups,DC=pace,DC=edu,DC=vn': 'asset_manager',
        'CN=IT-Support,OU=Groups,DC=pace,DC=edu,DC=vn': 'support',
        'CN=Security-Analysts,OU=Groups,DC=pace,DC=edu,DC=vn': 'security_viewer',
        'CN=Auditors,OU=Groups,DC=pace,DC=edu,DC=vn': 'auditor'
    }
};

function claims(overrides: Partial<VerifiedOidcClaims> = {}): VerifiedOidcClaims {
    return {
        iss: configuration.issuer,
        aud: ['account', configuration.audience],
        sub: 'ad-object-guid-1',
        preferred_username: 'alice',
        groups: ['CN=IT-Support,OU=Groups,DC=pace,DC=edu,DC=vn'],
        iat: NOW - 30,
        exp: NOW + 300,
        ...overrides
    };
}

test('maps only explicitly configured groups to application roles', () => {
    const identity = identityFromVerifiedClaims(claims({
        groups: [
            'cn=uem-admins,ou=groups,dc=pace,dc=edu,dc=vn',
            'CN=Auditors,OU=Groups,DC=pace,DC=edu,DC=vn',
            'CN=Unmapped,OU=Groups,DC=pace,DC=edu,DC=vn'
        ],
        roles: ['uem_admin', 'some-injected-role']
    }), configuration, NOW);

    assert.deepEqual(identity.roles, ['uem_admin', 'auditor']);
    assert.equal(hasAnyRequiredRole(identity, ['uem_admin']), true);
    assert.equal(hasAnyRequiredRole(identity, ['asset_manager']), false);
});

test('rejects a token from another issuer', () => {
    assert.throws(
        () => identityFromVerifiedClaims(claims({ iss: 'https://evil.example.test' }), configuration, NOW),
        (error: unknown) => error instanceof IdentityValidationError
            && error.code === 'invalid-issuer'
    );
});

test('rejects a token not intended for this API', () => {
    assert.throws(
        () => identityFromVerifiedClaims(claims({ aud: ['account', 'different-api'] }), configuration, NOW),
        (error: unknown) => error instanceof IdentityValidationError
            && error.code === 'invalid-audience'
    );
});

test('rejects expired and not-yet-valid tokens', () => {
    assert.throws(
        () => identityFromVerifiedClaims(claims({ exp: NOW - 31 }), configuration, NOW),
        (error: unknown) => error instanceof IdentityValidationError && error.code === 'expired'
    );
    assert.throws(
        () => identityFromVerifiedClaims(claims({ nbf: NOW + 31 }), configuration, NOW),
        (error: unknown) => error instanceof IdentityValidationError && error.code === 'not-yet-valid'
    );
});

test('requires stable subject, username, and correctly typed groups', () => {
    for (const [override, code] of [
        [{ sub: '' }, 'invalid-subject'],
        [{ preferred_username: '' }, 'invalid-username'],
        [{ groups: 'UEM-Admins' }, 'invalid-groups']
    ] as const) {
        assert.throws(
            () => identityFromVerifiedClaims(claims(override), configuration, NOW),
            (error: unknown) => error instanceof IdentityValidationError && error.code === code
        );
    }
});

test('authenticated users with no mapped group receive no application role', () => {
    const identity = identityFromVerifiedClaims(
        claims({ groups: ['CN=Unmapped,OU=Groups,DC=pace,DC=edu,DC=vn'] }),
        configuration,
        NOW
    );

    assert.deepEqual(identity.roles, []);
    assert.equal(hasAnyRequiredRole(identity, ['support', 'auditor']), false);
});

test('rejects ambiguous case-insensitive group mapping configuration', () => {
    assert.throws(
        () => identityFromVerifiedClaims(claims(), {
            ...configuration,
            groupRoleMapping: {
                'PACE\\UEM-Admins': 'uem_admin',
                'pace\\uem-admins': 'support'
            }
        }, NOW),
        (error: unknown) => error instanceof IdentityValidationError
            && error.code === 'invalid-configuration'
    );
});
