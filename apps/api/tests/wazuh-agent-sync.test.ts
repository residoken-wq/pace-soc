import assert from 'node:assert/strict';
import test from 'node:test';

import {
    normalizeWazuhAgent,
    planWazuhAgentSync,
    type ExistingDevice
} from '../src/integrations/wazuh/agent-sync.ts';

const existing: ExistingDevice[] = [
    {
        id: 'device-1',
        hostname: 'pilot-01',
        systemUuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        serial: 'SERIAL-001',
        identities: [{
            source: 'wazuh',
            environment: 'production',
            type: 'agent_id',
            normalizedValue: '001'
        }]
    },
    {
        id: 'device-2',
        hostname: 'shared-name',
        systemUuid: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        serial: 'SERIAL-002',
        identities: []
    }
];

test('normalizes Wazuh status and namespaces external identity', () => {
    const candidate = normalizeWazuhAgent({
        id: '007',
        name: 'PILOT-07',
        status: 'disconnected',
        serial: ' Serial-007 '
    }, 'PRODUCTION');

    assert.deepEqual(candidate.externalIdentity, {
        source: 'wazuh',
        environment: 'production',
        type: 'agent_id',
        value: '007',
        normalizedValue: '007'
    });
    assert.equal(candidate.normalizedHostname, 'pilot-07');
    assert.equal(candidate.serial, 'serial-007');
    assert.equal(candidate.status, 'inactive');
});

test('excludes the Wazuh manager pseudo-agent', () => {
    assert.deepEqual(
        planWazuhAgentSync([{ id: '000', name: 'manager' }], existing, 'production'),
        [{ action: 'skip', agentId: '000', reason: 'manager-pseudo-agent' }]
    );
});

test('updates the device already linked by namespaced Wazuh identity', () => {
    const [plan] = planWazuhAgentSync([
        { id: '001', name: 'renamed-pilot', status: 'active' }
    ], existing, 'production');

    assert.equal(plan.action, 'update');
    assert.equal(plan.action === 'update' ? plan.deviceId : undefined, 'device-1');
});

test('links one unambiguous system UUID match', () => {
    const [plan] = planWazuhAgentSync([{
        id: '010',
        name: 'new-hostname',
        systemUuid: 'BBBBBBBB-BBBB-4BBB-8BBB-BBBBBBBBBBBB'
    }], existing, 'production');

    assert.equal(plan.action, 'link');
    if (plan.action === 'link') {
        assert.equal(plan.deviceId, 'device-2');
        assert.equal(plan.matchedBy, 'system_uuid');
    }
});

test('does not automatically merge a hostname-only match', () => {
    const [plan] = planWazuhAgentSync([
        { id: '011', name: 'SHARED-NAME' }
    ], existing, 'production');

    assert.equal(plan.action, 'review');
    if (plan.action === 'review') {
        assert.equal(plan.reason, 'hostname-only');
        assert.deepEqual(plan.candidateDeviceIds, ['device-2']);
    }
});

test('routes conflicting high-confidence signals to review', () => {
    const [plan] = planWazuhAgentSync([{
        id: '012',
        name: 'ambiguous',
        systemUuid: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        serial: 'serial-002'
    }], existing, 'production');

    assert.equal(plan.action, 'review');
    if (plan.action === 'review') {
        assert.equal(plan.reason, 'conflicting-high-confidence-signals');
        assert.deepEqual(plan.candidateDeviceIds, ['device-1', 'device-2']);
    }
});

test('ignores placeholder serials and creates a new candidate', () => {
    const [plan] = planWazuhAgentSync([{
        id: '013',
        name: 'new-device',
        serial: 'To Be Filled By O.E.M.'
    }], existing, 'production');

    assert.equal(plan.action, 'create');
    assert.equal(plan.action === 'create' ? plan.candidate.serial : 'unexpected', undefined);
});

test('rejects duplicate agent IDs in one synchronization page', () => {
    assert.throws(
        () => planWazuhAgentSync([
            { id: '014', name: 'first' },
            { id: '014', name: 'second' }
        ], existing, 'production'),
        /duplicate Wazuh agent id/
    );
});
