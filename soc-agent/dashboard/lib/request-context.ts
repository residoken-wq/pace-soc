import { randomUUID } from 'node:crypto';

const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const REQUEST_ID_HEADER = 'x-request-id';

export function isValidRequestId(value: string | null | undefined): value is string {
    return Boolean(value && REQUEST_ID_PATTERN.test(value));
}

export function resolveRequestId(candidate: string | null | undefined): string {
    return isValidRequestId(candidate) ? candidate : randomUUID();
}
