import assert from 'node:assert/strict';
import test from 'node:test';

import { transformWazuhAgent, transformWazuhAgents } from '../lib/wazuh-transform.ts';

test('normalizes a Wazuh agent for dashboard consumption', () => {
    assert.deepEqual(
        transformWazuhAgent({
            id: '001',
            name: 'pilot-01',
            ip: '192.0.2.10',
            status: 'active',
            os: { name: 'Ubuntu' },
            version: 'Wazuh v4',
            lastKeepAlive: '2026-07-25T01:00:00Z',
            group: ['pilot']
        }),
        {
            id: '001',
            name: 'pilot-01',
            ip: '192.0.2.10',
            status: 'active',
            os: 'Ubuntu',
            version: 'Wazuh v4',
            lastKeepAlive: '2026-07-25T01:00:00Z',
            group: ['pilot']
        }
    );
});

test('uses stable defaults for missing optional Wazuh fields', () => {
    const transformed = transformWazuhAgent({ id: '002', name: 'pilot-02' });

    assert.equal(transformed.os, 'Unknown');
    assert.deepEqual(transformed.group, []);
});

test('preserves input order when transforming a collection', () => {
    const transformed = transformWazuhAgents([
        { id: '001', name: 'first' },
        { id: '002', name: 'second' }
    ]);

    assert.deepEqual(transformed.map(agent => agent.id), ['001', '002']);
});
