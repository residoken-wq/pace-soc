import assert from 'node:assert/strict';
import test from 'node:test';

import {
    decideReconciliationItem,
    ReconciliationDecisionError,
    type ReconciliationItem
} from '../src/reconciliation/decision.ts';

const pendingItem: ReconciliationItem = {
    id: 'reconciliation-1',
    status: 'pending',
    reason: 'hostname-only',
    candidateDeviceIds: ['device-1', 'device-2'],
    version: 3
};

test('asset manager can link one of the reviewed candidates', () => {
    const result = decideReconciliationItem(pendingItem, {
        decision: 'link_existing',
        selectedDeviceId: 'device-2',
        justification: 'Confirmed from physical asset tag',
        expectedVersion: 3,
        actor: { username: 'asset.manager', role: 'asset_manager' }
    });

    assert.equal(result.item.status, 'resolved');
    assert.equal(result.item.version, 4);
    assert.deepEqual(result.effect, { type: 'link-existing', deviceId: 'device-2' });
    assert.equal(result.audit.metadata.previousVersion, 3);
});

test('cannot link a device outside the reviewed candidate set', () => {
    assert.throws(
        () => decideReconciliationItem(pendingItem, {
            decision: 'link_existing',
            selectedDeviceId: 'device-not-reviewed',
            justification: 'Attempt outside reviewed candidate list',
            expectedVersion: 3,
            actor: { username: 'admin', role: 'uem_admin' }
        }),
        (error: unknown) => error instanceof ReconciliationDecisionError
            && error.code === 'invalid-decision'
    );
});

test('support and read-only roles cannot decide reconciliation', () => {
    assert.throws(
        () => decideReconciliationItem(pendingItem, {
            decision: 'create_new',
            justification: 'Confirmed genuinely new device',
            expectedVersion: 3,
            actor: { username: 'support.user', role: 'support' }
        }),
        (error: unknown) => error instanceof ReconciliationDecisionError
            && error.code === 'forbidden'
    );
});

test('optimistic version mismatch produces a conflict', () => {
    assert.throws(
        () => decideReconciliationItem(pendingItem, {
            decision: 'dismiss',
            justification: 'Duplicate source record confirmed',
            expectedVersion: 2,
            actor: { username: 'admin', role: 'uem_admin' }
        }),
        (error: unknown) => error instanceof ReconciliationDecisionError
            && error.code === 'conflict'
    );
});

test('already decided items cannot be decided again', () => {
    assert.throws(
        () => decideReconciliationItem(
            { ...pendingItem, status: 'resolved' },
            {
                decision: 'dismiss',
                justification: 'Attempt to change prior decision',
                expectedVersion: 3,
                actor: { username: 'admin', role: 'uem_admin' }
            }
        ),
        (error: unknown) => error instanceof ReconciliationDecisionError
            && error.code === 'conflict'
    );
});

test('create and dismiss reject an unrelated selected device', () => {
    for (const decision of ['create_new', 'dismiss'] as const) {
        assert.throws(
            () => decideReconciliationItem(pendingItem, {
                decision,
                selectedDeviceId: 'device-1',
                justification: 'Invalid selected device combination',
                expectedVersion: 3,
                actor: { username: 'admin', role: 'uem_admin' }
            }),
            (error: unknown) => error instanceof ReconciliationDecisionError
                && error.code === 'invalid-decision'
        );
    }
});

test('requires a meaningful decision justification', () => {
    assert.throws(
        () => decideReconciliationItem(pendingItem, {
            decision: 'dismiss',
            justification: 'duplicate',
            expectedVersion: 3,
            actor: { username: 'admin', role: 'uem_admin' }
        }),
        (error: unknown) => error instanceof ReconciliationDecisionError
            && error.code === 'invalid-decision'
    );
});
