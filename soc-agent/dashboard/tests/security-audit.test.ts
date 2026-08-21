import assert from 'node:assert/strict';
import test from 'node:test';

import {
    auditActorFromHeaders,
    createSecurityAuditEvent,
    sanitizeAuditMetadata
} from '../lib/security-audit.ts';

test('creates an attributable, versioned audit event', () => {
    const event = createSecurityAuditEvent({
        requestId: '018f8f72-8b4f-7ab4-9d2f-9d1f67a51342',
        actor: { username: 'alice', role: 'admin' },
        action: 'wazuh.agent.restart',
        target: { type: 'wazuh-agent', id: '001' },
        outcome: 'success',
        sourceIp: '192.0.2.20',
        timestamp: '2026-07-25T01:00:00.000Z'
    });

    assert.equal(event.schemaVersion, 1);
    assert.equal(event.actor.username, 'alice');
    assert.equal(event.target.id, '001');
    assert.equal(event.requestId, '018f8f72-8b4f-7ab4-9d2f-9d1f67a51342');
    assert.equal(event.timestamp, '2026-07-25T01:00:00.000Z');
});

test('redacts sensitive metadata recursively', () => {
    assert.deepEqual(
        sanitizeAuditMetadata({
            apiKey: 'sensitive',
            nested: {
                password: 'sensitive',
                result: 'failed'
            },
            authorization: 'Bearer sensitive',
            ordinary: 'visible'
        }),
        {
            apiKey: '[REDACTED]',
            nested: {
                password: '[REDACTED]',
                result: 'failed'
            },
            authorization: '[REDACTED]',
            ordinary: 'visible'
        }
    );
});

test('fails actor attribution closed when trusted proxy headers are absent', () => {
    assert.deepEqual(
        auditActorFromHeaders(new Headers()),
        { username: 'unknown', role: 'unknown' }
    );
});
