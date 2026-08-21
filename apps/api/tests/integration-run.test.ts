import assert from 'node:assert/strict';
import test from 'node:test';

import {
    completeIntegrationRun,
    createIntegrationIdempotencyKey,
    createIntegrationRun,
    failIntegrationRun,
    IntegrationRunError,
    startIntegrationRun
} from '../src/integrations/run-state.ts';
import {
    buildWazuhSyncBatch,
    buildWazuhSyncBatchFromResponse
} from '../src/integrations/wazuh/sync-batch.ts';
import { WazuhAgentPageError } from '../src/integrations/wazuh/agent-page.ts';

test('idempotency key is stable across normalized integration identifiers', () => {
    const first = createIntegrationIdempotencyKey('WAZUH', 'Production', 'Agents', 'cursor-10');
    const replay = createIntegrationIdempotencyKey(' wazuh ', ' production ', ' agents ', 'cursor-10');
    const nextPage = createIntegrationIdempotencyKey('wazuh', 'production', 'agents', 'cursor-11');

    assert.equal(first, replay);
    assert.notEqual(first, nextPage);
    assert.match(first, /^[0-9a-f]{64}$/);
});

test('successful run follows pending to running to succeeded', () => {
    const pending = createIntegrationRun({
        integration: 'wazuh',
        environment: 'production',
        stream: 'agents',
        sourceCursor: 'cursor-10',
        plannedCount: 3
    });
    const running = startIntegrationRun(pending);
    const succeeded = completeIntegrationRun(running, { appliedCount: 2, reviewCount: 1 });

    assert.equal(running.attemptCount, 1);
    assert.equal(succeeded.state, 'succeeded');
    assert.equal(succeeded.appliedCount, 2);
    assert.equal(succeeded.reviewCount, 1);
});

test('failed runs retry until the final attempt becomes dead letter', () => {
    let run = createIntegrationRun({
        integration: 'wazuh',
        environment: 'production',
        stream: 'agents',
        sourceCursor: 'cursor-retry',
        plannedCount: 1,
        maxAttempts: 2
    });

    run = failIntegrationRun(startIntegrationRun(run), 'WAZUH_TIMEOUT');
    assert.equal(run.state, 'failed');
    assert.equal(run.attemptCount, 1);

    run = failIntegrationRun(startIntegrationRun(run), 'WAZUH_TIMEOUT');
    assert.equal(run.state, 'dead_letter');
    assert.equal(run.attemptCount, 2);
    assert.throws(
        () => startIntegrationRun(run),
        (error: unknown) => error instanceof IntegrationRunError
            && error.code === 'invalid-transition'
    );
});

test('completion rejects partial or inconsistent counts', () => {
    const running = startIntegrationRun(createIntegrationRun({
        integration: 'wazuh',
        environment: 'production',
        stream: 'agents',
        sourceCursor: 'cursor-counts',
        plannedCount: 3
    }));

    assert.throws(
        () => completeIntegrationRun(running, { appliedCount: 1, reviewCount: 1 }),
        (error: unknown) => error instanceof IntegrationRunError
            && error.code === 'invalid-counts'
    );
});

test('completed or running runs cannot be started again', () => {
    const running = startIntegrationRun(createIntegrationRun({
        integration: 'wazuh',
        environment: 'production',
        stream: 'agents',
        sourceCursor: 'cursor-state',
        plannedCount: 0
    }));
    const completed = completeIntegrationRun(running, { appliedCount: 0, reviewCount: 0 });

    for (const run of [running, completed]) {
        assert.throws(
            () => startIntegrationRun(run),
            (error: unknown) => error instanceof IntegrationRunError
                && error.code === 'invalid-transition'
        );
    }
});

test('Wazuh batch excludes manager pseudo-agent from planned count', () => {
    const batch = buildWazuhSyncBatch({
        agents: [
            { id: '000', name: 'manager' },
            { id: '001', name: 'pilot-01', status: 'active' },
            { id: '002', name: 'pilot-02', status: 'disconnected' }
        ],
        existingDevices: [],
        environment: 'production',
        sourceCursor: 'page-1'
    });

    assert.equal(batch.plans.length, 3);
    assert.equal(batch.skippedCount, 1);
    assert.equal(batch.run.plannedCount, 2);
    assert.equal(batch.run.idempotencyKey, createIntegrationIdempotencyKey(
        'wazuh',
        'production',
        'agents',
        'page-1'
    ));
});

test('Wazuh response is validated before a synchronization batch is planned', () => {
    const batch = buildWazuhSyncBatchFromResponse({
        response: {
            data: {
                affected_items: [
                    { id: '000', name: 'manager' },
                    { id: '001', name: 'pilot-01', status: 'active' }
                ],
                total_affected_items: 14
            }
        },
        existingDevices: [],
        environment: 'production',
        sourceCursor: 'offset:0'
    });

    assert.equal(batch.sourceTotalCount, 14);
    assert.equal(batch.run.plannedCount, 1);
    assert.equal(batch.skippedCount, 1);
});

test('invalid Wazuh response cannot create an integration run', () => {
    assert.throws(
        () => buildWazuhSyncBatchFromResponse({
            response: {
                data: {
                    affected_items: [{ id: '001' }],
                    total_affected_items: 1
                }
            },
            existingDevices: [],
            environment: 'production',
            sourceCursor: 'offset:0'
        }),
        (error: unknown) =>
            error instanceof WazuhAgentPageError && error.code === 'invalid-agent'
    );
});
