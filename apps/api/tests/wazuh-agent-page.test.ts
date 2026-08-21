import assert from 'node:assert/strict';
import test from 'node:test';

import {
    MAX_WAZUH_AGENT_PAGE_SIZE,
    parseWazuhAgentPage,
    WazuhAgentPageError
} from '../src/integrations/wazuh/agent-page.ts';

test('validates and extracts a bounded Wazuh agent page', () => {
    const page = parseWazuhAgentPage({
        data: {
            affected_items: [
                {
                    id: '001',
                    name: 'pilot-01',
                    status: 'active',
                    os: { name: 'Ubuntu', version: '24.04' }
                }
            ],
            total_affected_items: 3
        }
    });

    assert.deepEqual(page, {
        agents: [
            {
                id: '001',
                name: 'pilot-01',
                status: 'active',
                os: { name: 'Ubuntu', version: '24.04' }
            }
        ],
        totalAffectedItems: 3
    });
});

test('rejects malformed agents before reconciliation planning', () => {
    assert.throws(
        () => parseWazuhAgentPage({
            data: {
                affected_items: [{ id: '001', name: 'pilot-01', os: 'Ubuntu' }],
                total_affected_items: 1
            }
        }),
        (error: unknown) =>
            error instanceof WazuhAgentPageError && error.code === 'invalid-agent'
    );
});

test('rejects oversized pages', () => {
    const affectedItems = Array.from(
        { length: MAX_WAZUH_AGENT_PAGE_SIZE + 1 },
        (_, index) => ({ id: String(index + 1), name: `pilot-${index + 1}` })
    );

    assert.throws(
        () => parseWazuhAgentPage({
            data: { affected_items: affectedItems, total_affected_items: affectedItems.length }
        }),
        (error: unknown) =>
            error instanceof WazuhAgentPageError && error.code === 'page-too-large'
    );
});

test('rejects invalid totals and invalid caller page bounds', () => {
    assert.throws(
        () => parseWazuhAgentPage({
            data: { affected_items: [], total_affected_items: -1 }
        }),
        (error: unknown) =>
            error instanceof WazuhAgentPageError && error.code === 'invalid-response'
    );
    assert.throws(() => parseWazuhAgentPage({}, 0), RangeError);
});
