import { createHash } from 'node:crypto';

export type IntegrationRunState = 'pending' | 'running' | 'succeeded' | 'failed' | 'dead_letter';

export interface IntegrationRun {
    integration: string;
    environment: string;
    stream: string;
    sourceCursor: string;
    idempotencyKey: string;
    state: IntegrationRunState;
    attemptCount: number;
    maxAttempts: number;
    plannedCount: number;
    appliedCount: number;
    reviewCount: number;
    errorCode?: string;
}

export class IntegrationRunError extends Error {
    public readonly code: 'invalid-transition' | 'invalid-counts' | 'attempts-exhausted';

    constructor(
        code: 'invalid-transition' | 'invalid-counts' | 'attempts-exhausted',
        message: string
    ) {
        super(message);
        this.name = 'IntegrationRunError';
        this.code = code;
    }
}

function requiredPart(value: string, field: string): string {
    const normalized = value.trim().toLowerCase();
    if (!normalized) throw new Error(`${field} must not be empty`);
    return normalized;
}

export function createIntegrationIdempotencyKey(
    integration: string,
    environment: string,
    stream: string,
    sourceCursor: string
): string {
    const parts = [
        requiredPart(integration, 'integration'),
        requiredPart(environment, 'environment'),
        requiredPart(stream, 'stream'),
        sourceCursor.trim()
    ];
    if (!parts[3]) throw new Error('source cursor must not be empty');

    return createHash('sha256').update(parts.join('\0')).digest('hex');
}

export function createIntegrationRun(input: {
    integration: string;
    environment: string;
    stream: string;
    sourceCursor: string;
    plannedCount: number;
    maxAttempts?: number;
}): IntegrationRun {
    if (!Number.isInteger(input.plannedCount) || input.plannedCount < 0) {
        throw new IntegrationRunError('invalid-counts', 'planned count must be a non-negative integer');
    }
    const maxAttempts = input.maxAttempts ?? 5;
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
        throw new IntegrationRunError('invalid-counts', 'max attempts must be a positive integer');
    }

    return {
        integration: requiredPart(input.integration, 'integration'),
        environment: requiredPart(input.environment, 'environment'),
        stream: requiredPart(input.stream, 'stream'),
        sourceCursor: input.sourceCursor.trim(),
        idempotencyKey: createIntegrationIdempotencyKey(
            input.integration,
            input.environment,
            input.stream,
            input.sourceCursor
        ),
        state: 'pending',
        attemptCount: 0,
        maxAttempts,
        plannedCount: input.plannedCount,
        appliedCount: 0,
        reviewCount: 0
    };
}

export function startIntegrationRun(current: IntegrationRun): IntegrationRun {
    if (current.state !== 'pending' && current.state !== 'failed') {
        throw new IntegrationRunError('invalid-transition', `cannot start a ${current.state} run`);
    }
    if (current.attemptCount >= current.maxAttempts) {
        throw new IntegrationRunError('attempts-exhausted', 'integration run attempts are exhausted');
    }

    return {
        ...current,
        state: 'running',
        attemptCount: current.attemptCount + 1,
        errorCode: undefined
    };
}

export function completeIntegrationRun(
    current: IntegrationRun,
    counts: { appliedCount: number; reviewCount: number }
): IntegrationRun {
    if (current.state !== 'running') {
        throw new IntegrationRunError('invalid-transition', `cannot complete a ${current.state} run`);
    }
    if (
        !Number.isInteger(counts.appliedCount)
        || !Number.isInteger(counts.reviewCount)
        || counts.appliedCount < 0
        || counts.reviewCount < 0
        || counts.appliedCount + counts.reviewCount !== current.plannedCount
    ) {
        throw new IntegrationRunError(
            'invalid-counts',
            'applied and review counts must be non-negative integers totaling planned count'
        );
    }

    return {
        ...current,
        state: 'succeeded',
        appliedCount: counts.appliedCount,
        reviewCount: counts.reviewCount,
        errorCode: undefined
    };
}

export function failIntegrationRun(current: IntegrationRun, errorCode: string): IntegrationRun {
    if (current.state !== 'running') {
        throw new IntegrationRunError('invalid-transition', `cannot fail a ${current.state} run`);
    }
    const normalizedErrorCode = errorCode.trim();
    if (!normalizedErrorCode) throw new Error('error code must not be empty');

    return {
        ...current,
        state: current.attemptCount >= current.maxAttempts ? 'dead_letter' : 'failed',
        errorCode: normalizedErrorCode,
        appliedCount: 0,
        reviewCount: 0
    };
}
