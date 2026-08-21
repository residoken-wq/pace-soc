import assert from 'node:assert/strict';
import test from 'node:test';

import {
    advanceWazuhPage,
    createWazuhPageCursor,
    serializeWazuhPageCursor,
    WazuhPaginationError
} from '../src/integrations/wazuh/pagination.ts';

test('creates a bounded stable initial cursor', () => {
    const cursor = createWazuhPageCursor();
    assert.deepEqual(cursor, { offset: 0, limit: 200 });
    assert.equal(serializeWazuhPageCursor(cursor), 'offset:0:limit:200');
});

test('advances by the actual returned count with a stable next cursor', () => {
    assert.deepEqual(advanceWazuhPage({
        cursor: { offset: 0, limit: 100 },
        returnedCount: 100,
        totalAffectedItems: 250
    }), {
        state: 'next',
        cursor: { offset: 100, limit: 100 },
        sourceCursor: 'offset:100:limit:100',
        processedCount: 100
    });
});

test('marks the final partial or empty source page complete', () => {
    assert.deepEqual(advanceWazuhPage({
        cursor: { offset: 200, limit: 100 },
        returnedCount: 50,
        totalAffectedItems: 250
    }), {
        state: 'complete',
        processedCount: 250
    });
    assert.deepEqual(advanceWazuhPage({
        cursor: { offset: 0, limit: 100 },
        returnedCount: 0,
        totalAffectedItems: 0
    }), {
        state: 'complete',
        processedCount: 0
    });
});

test('rejects zero-progress and inconsistent source pages', () => {
    assert.throws(
        () => advanceWazuhPage({
            cursor: { offset: 100, limit: 100 },
            returnedCount: 0,
            totalAffectedItems: 250
        }),
        (error: unknown) =>
            error instanceof WazuhPaginationError && error.code === 'no-progress'
    );

    for (const input of [
        { cursor: { offset: 0, limit: 100 }, returnedCount: 101, totalAffectedItems: 200 },
        { cursor: { offset: 300, limit: 100 }, returnedCount: 0, totalAffectedItems: 200 },
        { cursor: { offset: 100, limit: 100 }, returnedCount: 100, totalAffectedItems: 150 }
    ]) {
        assert.throws(
            () => advanceWazuhPage(input),
            (error: unknown) =>
                error instanceof WazuhPaginationError && error.code === 'inconsistent-page'
        );
    }
});

test('rejects unsafe or oversized cursors', () => {
    assert.throws(() => createWazuhPageCursor(-1, 100), WazuhPaginationError);
    assert.throws(() => createWazuhPageCursor(0, 201), WazuhPaginationError);
});
