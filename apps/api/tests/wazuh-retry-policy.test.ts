import assert from 'node:assert/strict';
import test from 'node:test';

import {
    decideWazuhRetry,
    type WazuhRetryPolicy
} from '../src/integrations/wazuh/retry-policy.ts';

const policy: WazuhRetryPolicy = {
    maxAttempts: 4,
    baseDelayMs: 1_000,
    maxDelayMs: 5_000,
    jitterRatio: 0.2
};

test('retries timeouts with deterministic bounded exponential backoff', () => {
    assert.deepEqual(decideWazuhRetry({
        failure: { kind: 'timeout' },
        attempt: 1,
        policy,
        jitterUnit: 0
    }), {
        action: 'retry',
        delayMs: 800,
        nextAttempt: 2,
        reason: 'TIMEOUT'
    });

    assert.deepEqual(decideWazuhRetry({
        failure: { kind: 'network' },
        attempt: 3,
        policy,
        jitterUnit: 1
    }), {
        action: 'retry',
        delayMs: 4_800,
        nextAttempt: 4,
        reason: 'NETWORK'
    });
});

test('honors a rate-limit retry delay without exceeding the configured cap', () => {
    assert.deepEqual(decideWazuhRetry({
        failure: { kind: 'http', status: 429, retryAfterMs: 20_000 },
        attempt: 1,
        policy,
        jitterUnit: 0.5
    }), {
        action: 'retry',
        delayMs: 5_000,
        nextAttempt: 2,
        reason: 'HTTP_429'
    });
});

test('retries transient server errors but stops on authentication and terminal statuses', () => {
    assert.equal(decideWazuhRetry({
        failure: { kind: 'http', status: 503 },
        attempt: 1,
        policy
    }).action, 'retry');

    for (const status of [400, 401, 403, 404, 501, 505]) {
        assert.deepEqual(decideWazuhRetry({
            failure: { kind: 'http', status },
            attempt: 1,
            policy
        }), {
            action: 'stop',
            reason: `HTTP_${status}`
        });
    }
});

test('stops once the attempt budget is exhausted', () => {
    assert.deepEqual(decideWazuhRetry({
        failure: { kind: 'timeout' },
        attempt: 4,
        policy
    }), {
        action: 'stop',
        reason: 'MAX_ATTEMPTS'
    });
});

test('rejects invalid policy and untrusted response metadata', () => {
    assert.throws(() => decideWazuhRetry({
        failure: { kind: 'timeout' },
        attempt: 1,
        policy: { ...policy, maxAttempts: 0 }
    }), RangeError);

    assert.throws(() => decideWazuhRetry({
        failure: { kind: 'http', status: 429, retryAfterMs: -1 },
        attempt: 1,
        policy
    }), RangeError);
});
