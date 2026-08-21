import assert from 'node:assert/strict';
import test from 'node:test';

import { createToken, isJwtConfigured, validateToken } from '../lib/token.ts';

const VALID_SECRET = 'test-secret-that-is-at-least-32-characters';

function withSecret(secret: string | undefined, run: () => void): void {
    const previous = process.env.JWT_SECRET;
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;

    try {
        run();
    } finally {
        if (previous === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previous;
    }
}

test('JWT configuration requires at least 32 characters', () => {
    withSecret(undefined, () => assert.equal(isJwtConfigured(), false));
    withSecret('too-short', () => assert.equal(isJwtConfigured(), false));
    withSecret(VALID_SECRET, () => assert.equal(isJwtConfigured(), true));
});

test('creates and validates an authenticated user token', () => {
    withSecret(VALID_SECRET, () => {
        const token = createToken('alice', 'admin', 'Alice Admin');
        const payload = validateToken(token);

        assert.equal(payload?.username, 'alice');
        assert.equal(payload?.role, 'admin');
        assert.equal(payload?.name, 'Alice Admin');
        assert.ok(payload && payload.exp > payload.iat);
    });
});

test('rejects a token whose payload or signature was changed', () => {
    withSecret(VALID_SECRET, () => {
        const token = createToken('alice', 'analyst', 'Alice Analyst');
        const parts = token.split('.');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        payload.role = 'admin';
        parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');

        assert.equal(validateToken(parts.join('.')), null);
    });
});

test('rejects a token signed with a different secret', () => {
    let token = '';
    withSecret(VALID_SECRET, () => {
        token = createToken('alice', 'admin', 'Alice Admin');
    });

    withSecret('different-secret-that-is-at-least-32-characters', () => {
        assert.equal(validateToken(token), null);
    });
});

test('fails closed when JWT configuration is missing', () => {
    withSecret(undefined, () => {
        assert.equal(validateToken('not-a-token'), null);
        assert.throws(
            () => createToken('alice', 'admin', 'Alice Admin'),
            /JWT_SECRET must be configured/
        );
    });
});
