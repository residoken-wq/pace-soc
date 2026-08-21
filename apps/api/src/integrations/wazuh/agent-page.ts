import type { WazuhAgentInput } from './agent-sync.ts';

export const MAX_WAZUH_AGENT_PAGE_SIZE = 200;

export class WazuhAgentPageError extends Error {
    readonly code: 'invalid-response' | 'invalid-agent' | 'page-too-large';

    constructor(
        code: 'invalid-response' | 'invalid-agent' | 'page-too-large',
        message: string
    ) {
        super(message);
        this.name = 'WazuhAgentPageError';
        this.code = code;
    }
}

export interface WazuhAgentPage {
    agents: WazuhAgentInput[];
    totalAffectedItems: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(
    record: Record<string, unknown>,
    field: string,
    agentIndex: number
): string | undefined {
    const value = record[field];
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') {
        throw new WazuhAgentPageError(
            'invalid-agent',
            `agent ${agentIndex} field ${field} must be a string`
        );
    }
    return value;
}

function requiredString(
    record: Record<string, unknown>,
    field: string,
    agentIndex: number
): string {
    const value = optionalString(record, field, agentIndex);
    if (!value?.trim()) {
        throw new WazuhAgentPageError(
            'invalid-agent',
            `agent ${agentIndex} field ${field} is required`
        );
    }
    return value;
}

function parseAgent(value: unknown, index: number): WazuhAgentInput {
    if (!isRecord(value)) {
        throw new WazuhAgentPageError('invalid-agent', `agent ${index} must be an object`);
    }

    const os = value.os;
    if (os !== undefined && os !== null && !isRecord(os)) {
        throw new WazuhAgentPageError('invalid-agent', `agent ${index} field os must be an object`);
    }

    return {
        id: requiredString(value, 'id', index),
        name: requiredString(value, 'name', index),
        ...(optionalString(value, 'ip', index) !== undefined
            ? { ip: optionalString(value, 'ip', index) }
            : {}),
        ...(optionalString(value, 'status', index) !== undefined
            ? { status: optionalString(value, 'status', index) }
            : {}),
        ...(optionalString(value, 'version', index) !== undefined
            ? { version: optionalString(value, 'version', index) }
            : {}),
        ...(optionalString(value, 'lastKeepAlive', index) !== undefined
            ? { lastKeepAlive: optionalString(value, 'lastKeepAlive', index) }
            : {}),
        ...(optionalString(value, 'systemUuid', index) !== undefined
            ? { systemUuid: optionalString(value, 'systemUuid', index) }
            : {}),
        ...(optionalString(value, 'serial', index) !== undefined
            ? { serial: optionalString(value, 'serial', index) }
            : {}),
        ...(isRecord(os)
            ? {
                os: {
                    ...(optionalString(os, 'name', index) !== undefined
                        ? { name: optionalString(os, 'name', index) }
                        : {}),
                    ...(optionalString(os, 'version', index) !== undefined
                        ? { version: optionalString(os, 'version', index) }
                        : {})
                }
            }
            : {})
    };
}

export function parseWazuhAgentPage(
    response: unknown,
    maxPageSize = MAX_WAZUH_AGENT_PAGE_SIZE
): WazuhAgentPage {
    if (!Number.isInteger(maxPageSize) || maxPageSize < 1 || maxPageSize > MAX_WAZUH_AGENT_PAGE_SIZE) {
        throw new RangeError(`maxPageSize must be between 1 and ${MAX_WAZUH_AGENT_PAGE_SIZE}`);
    }
    if (!isRecord(response) || !isRecord(response.data)) {
        throw new WazuhAgentPageError('invalid-response', 'response data must be an object');
    }

    const affectedItems = response.data.affected_items;
    const totalAffectedItems = response.data.total_affected_items;
    if (!Array.isArray(affectedItems)) {
        throw new WazuhAgentPageError(
            'invalid-response',
            'response data.affected_items must be an array'
        );
    }
    if (affectedItems.length > maxPageSize) {
        throw new WazuhAgentPageError(
            'page-too-large',
            `response contains ${affectedItems.length} agents; maximum is ${maxPageSize}`
        );
    }
    if (!Number.isSafeInteger(totalAffectedItems) || (totalAffectedItems as number) < 0) {
        throw new WazuhAgentPageError(
            'invalid-response',
            'response data.total_affected_items must be a non-negative integer'
        );
    }

    return {
        agents: affectedItems.map(parseAgent),
        totalAffectedItems: totalAffectedItems as number
    };
}
