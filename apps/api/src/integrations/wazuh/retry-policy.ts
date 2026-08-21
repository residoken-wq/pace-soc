export interface WazuhRetryPolicy {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    jitterRatio: number;
}

export const DEFAULT_WAZUH_RETRY_POLICY: WazuhRetryPolicy = {
    maxAttempts: 4,
    baseDelayMs: 500,
    maxDelayMs: 30_000,
    jitterRatio: 0.2
};

export type WazuhRequestFailure =
    | { kind: 'timeout' | 'network' }
    | { kind: 'http'; status: number; retryAfterMs?: number };

export type WazuhRetryDecision =
    | { action: 'retry'; delayMs: number; nextAttempt: number; reason: string }
    | { action: 'stop'; reason: string };

function validatePolicy(policy: WazuhRetryPolicy): void {
    if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1 || policy.maxAttempts > 10) {
        throw new RangeError('maxAttempts must be an integer between 1 and 10');
    }
    if (!Number.isSafeInteger(policy.baseDelayMs) || policy.baseDelayMs < 1) {
        throw new RangeError('baseDelayMs must be a positive safe integer');
    }
    if (!Number.isSafeInteger(policy.maxDelayMs) || policy.maxDelayMs < policy.baseDelayMs) {
        throw new RangeError('maxDelayMs must be a safe integer greater than or equal to baseDelayMs');
    }
    if (!Number.isFinite(policy.jitterRatio) || policy.jitterRatio < 0 || policy.jitterRatio > 1) {
        throw new RangeError('jitterRatio must be between 0 and 1');
    }
}

function retryableHttpStatus(status: number): boolean {
    return status === 408
        || status === 425
        || status === 429
        || (status >= 500 && status <= 599 && status !== 501 && status !== 505);
}

function failureReason(failure: WazuhRequestFailure): string {
    return failure.kind === 'http' ? `HTTP_${failure.status}` : failure.kind.toUpperCase();
}

export function decideWazuhRetry(input: {
    failure: WazuhRequestFailure;
    attempt: number;
    policy?: WazuhRetryPolicy;
    jitterUnit?: number;
}): WazuhRetryDecision {
    const policy = input.policy ?? DEFAULT_WAZUH_RETRY_POLICY;
    validatePolicy(policy);

    if (!Number.isInteger(input.attempt) || input.attempt < 1) {
        throw new RangeError('attempt must be a positive integer');
    }
    if (
        input.failure.kind === 'http'
        && (!Number.isInteger(input.failure.status)
            || input.failure.status < 100
            || input.failure.status > 599)
    ) {
        throw new RangeError('HTTP status must be an integer between 100 and 599');
    }

    const reason = failureReason(input.failure);
    const retryable = input.failure.kind !== 'http' || retryableHttpStatus(input.failure.status);
    if (!retryable) return { action: 'stop', reason };
    if (input.attempt >= policy.maxAttempts) {
        return { action: 'stop', reason: 'MAX_ATTEMPTS' };
    }

    const jitterUnit = input.jitterUnit ?? 0.5;
    if (!Number.isFinite(jitterUnit) || jitterUnit < 0 || jitterUnit > 1) {
        throw new RangeError('jitterUnit must be between 0 and 1');
    }

    const exponentialDelay = Math.min(
        policy.maxDelayMs,
        policy.baseDelayMs * (2 ** (input.attempt - 1))
    );
    const jitterMultiplier = 1 + ((jitterUnit * 2 - 1) * policy.jitterRatio);
    const backoffDelay = Math.round(exponentialDelay * jitterMultiplier);
    const retryAfterMs = input.failure.kind === 'http'
        ? input.failure.retryAfterMs
        : undefined;
    if (
        retryAfterMs !== undefined
        && (!Number.isSafeInteger(retryAfterMs) || retryAfterMs < 0)
    ) {
        throw new RangeError('retryAfterMs must be a non-negative safe integer');
    }

    return {
        action: 'retry',
        delayMs: Math.min(policy.maxDelayMs, Math.max(backoffDelay, retryAfterMs ?? 0)),
        nextAttempt: input.attempt + 1,
        reason
    };
}
