import assert from 'node:assert/strict';
import test from 'node:test';

import { isValidRequestId, resolveRequestId } from '../lib/request-context.ts';

test('preserves a valid incoming UUID request ID', () => {
    const requestId = '018f8f72-8b4f-7ab4-9d2f-9d1f67a51342';

    assert.equal(isValidRequestId(requestId), true);
    assert.equal(resolveRequestId(requestId), requestId);
});

test('replaces missing or attacker-controlled request IDs', () => {
    const generated = resolveRequestId('not-a-valid-request-id');

    assert.equal(generated === 'not-a-valid-request-id', false);
    assert.equal(isValidRequestId(generated), true);
    assert.equal(isValidRequestId(resolveRequestId(null)), true);
});
