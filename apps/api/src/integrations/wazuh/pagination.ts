import { MAX_WAZUH_AGENT_PAGE_SIZE } from './agent-page.ts';

export interface WazuhPageCursor {
    offset: number;
    limit: number;
}

export type WazuhPageAdvance =
    | { state: 'complete'; processedCount: number }
    | { state: 'next'; cursor: WazuhPageCursor; sourceCursor: string; processedCount: number };

export class WazuhPaginationError extends Error {
    readonly code: 'invalid-cursor' | 'inconsistent-page' | 'no-progress';

    constructor(
        code: 'invalid-cursor' | 'inconsistent-page' | 'no-progress',
        message: string
    ) {
        super(message);
        this.name = 'WazuhPaginationError';
        this.code = code;
    }
}

function validateCursor(cursor: WazuhPageCursor): void {
    if (!Number.isSafeInteger(cursor.offset) || cursor.offset < 0) {
        throw new WazuhPaginationError(
            'invalid-cursor',
            'offset must be a non-negative safe integer'
        );
    }
    if (
        !Number.isSafeInteger(cursor.limit)
        || cursor.limit < 1
        || cursor.limit > MAX_WAZUH_AGENT_PAGE_SIZE
    ) {
        throw new WazuhPaginationError(
            'invalid-cursor',
            `limit must be between 1 and ${MAX_WAZUH_AGENT_PAGE_SIZE}`
        );
    }
}

export function createWazuhPageCursor(
    offset = 0,
    limit = MAX_WAZUH_AGENT_PAGE_SIZE
): WazuhPageCursor {
    const cursor = { offset, limit };
    validateCursor(cursor);
    return cursor;
}

export function serializeWazuhPageCursor(cursor: WazuhPageCursor): string {
    validateCursor(cursor);
    return `offset:${cursor.offset}:limit:${cursor.limit}`;
}

export function advanceWazuhPage(input: {
    cursor: WazuhPageCursor;
    returnedCount: number;
    totalAffectedItems: number;
}): WazuhPageAdvance {
    validateCursor(input.cursor);
    if (
        !Number.isSafeInteger(input.returnedCount)
        || input.returnedCount < 0
        || input.returnedCount > input.cursor.limit
    ) {
        throw new WazuhPaginationError(
            'inconsistent-page',
            'returned count must be between zero and the requested limit'
        );
    }
    if (!Number.isSafeInteger(input.totalAffectedItems) || input.totalAffectedItems < 0) {
        throw new WazuhPaginationError(
            'inconsistent-page',
            'source total must be a non-negative safe integer'
        );
    }
    if (input.cursor.offset > input.totalAffectedItems) {
        throw new WazuhPaginationError(
            'inconsistent-page',
            'page offset exceeds the source total'
        );
    }

    const processedCount = input.cursor.offset + input.returnedCount;
    if (processedCount > input.totalAffectedItems) {
        throw new WazuhPaginationError(
            'inconsistent-page',
            'page contents exceed the source total'
        );
    }
    if (processedCount >= input.totalAffectedItems) {
        return { state: 'complete', processedCount };
    }
    if (input.returnedCount === 0) {
        throw new WazuhPaginationError(
            'no-progress',
            'source returned an empty page before the advertised total'
        );
    }

    const cursor = createWazuhPageCursor(processedCount, input.cursor.limit);
    return {
        state: 'next',
        cursor,
        sourceCursor: serializeWazuhPageCursor(cursor),
        processedCount
    };
}
