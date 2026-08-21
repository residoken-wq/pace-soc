export type WazuhAgentStatus = 'active' | 'disconnected' | 'never_connected' | 'pending' | 'unknown';
export type DeviceStatus = 'pending' | 'active' | 'inactive' | 'retired' | 'quarantined';

const INVALID_SERIALS = new Set([
    'to be filled by o.e.m.',
    'default string',
    'unknown',
    'none',
    'n/a'
]);

export interface WazuhAgentInput {
    id: string;
    name: string;
    ip?: string;
    status?: string;
    version?: string;
    lastKeepAlive?: string;
    os?: {
        name?: string;
        version?: string;
    };
    systemUuid?: string;
    serial?: string;
}

export interface ExternalIdentity {
    source: 'wazuh';
    environment: string;
    type: 'agent_id';
    value: string;
    normalizedValue: string;
}

export interface WazuhDeviceCandidate {
    externalIdentity: ExternalIdentity;
    hostname: string;
    normalizedHostname: string;
    ip?: string;
    status: DeviceStatus;
    wazuhStatus: WazuhAgentStatus;
    wazuhVersion?: string;
    lastSeenAt?: string;
    osName?: string;
    osVersion?: string;
    systemUuid?: string;
    serial?: string;
}

export interface ExistingDevice {
    id: string;
    hostname: string;
    systemUuid?: string;
    serial?: string;
    identities: Array<{
        source: string;
        environment: string;
        type: string;
        normalizedValue: string;
    }>;
}

export type SyncPlanItem =
    | { action: 'skip'; agentId: string; reason: 'manager-pseudo-agent' }
    | { action: 'update'; agentId: string; deviceId: string; candidate: WazuhDeviceCandidate }
    | {
        action: 'link';
        agentId: string;
        deviceId: string;
        matchedBy: 'system_uuid' | 'serial';
        candidate: WazuhDeviceCandidate;
    }
    | {
        action: 'review';
        agentId: string;
        candidateDeviceIds: string[];
        reason: 'hostname-only' | 'conflicting-high-confidence-signals';
        candidate: WazuhDeviceCandidate;
    }
    | { action: 'create'; agentId: string; candidate: WazuhDeviceCandidate };

function normalizeRequired(value: string, field: string): string {
    const normalized = value.trim();
    if (!normalized) throw new Error(`${field} must not be empty`);
    return normalized;
}

function normalizeOptional(value: string | undefined): string | undefined {
    const normalized = value?.trim();
    return normalized || undefined;
}

function normalizeSerial(value: string | undefined): string | undefined {
    const normalized = normalizeOptional(value)?.toLowerCase();
    if (!normalized || INVALID_SERIALS.has(normalized)) return undefined;
    return normalized;
}

function normalizeSystemUuid(value: string | undefined): string | undefined {
    return normalizeOptional(value)?.toLowerCase();
}

function normalizeWazuhStatus(value: string | undefined): WazuhAgentStatus {
    switch (value?.toLowerCase()) {
        case 'active':
            return 'active';
        case 'disconnected':
            return 'disconnected';
        case 'never connected':
        case 'never_connected':
            return 'never_connected';
        case 'pending':
            return 'pending';
        default:
            return 'unknown';
    }
}

function deviceStatusForWazuhStatus(status: WazuhAgentStatus): DeviceStatus {
    if (status === 'active') return 'active';
    if (status === 'disconnected') return 'inactive';
    return 'pending';
}

export function normalizeWazuhAgent(
    input: WazuhAgentInput,
    environment: string
): WazuhDeviceCandidate {
    const agentId = normalizeRequired(input.id, 'agent id');
    const hostname = normalizeRequired(input.name, 'agent name');
    const normalizedEnvironment = normalizeRequired(environment, 'environment').toLowerCase();
    const wazuhStatus = normalizeWazuhStatus(input.status);

    return {
        externalIdentity: {
            source: 'wazuh',
            environment: normalizedEnvironment,
            type: 'agent_id',
            value: agentId,
            normalizedValue: agentId.toLowerCase()
        },
        hostname,
        normalizedHostname: hostname.toLowerCase(),
        ...(normalizeOptional(input.ip) ? { ip: normalizeOptional(input.ip) } : {}),
        status: deviceStatusForWazuhStatus(wazuhStatus),
        wazuhStatus,
        ...(normalizeOptional(input.version) ? { wazuhVersion: normalizeOptional(input.version) } : {}),
        ...(normalizeOptional(input.lastKeepAlive) ? { lastSeenAt: normalizeOptional(input.lastKeepAlive) } : {}),
        ...(normalizeOptional(input.os?.name) ? { osName: normalizeOptional(input.os?.name) } : {}),
        ...(normalizeOptional(input.os?.version) ? { osVersion: normalizeOptional(input.os?.version) } : {}),
        ...(normalizeSystemUuid(input.systemUuid) ? { systemUuid: normalizeSystemUuid(input.systemUuid) } : {}),
        ...(normalizeSerial(input.serial) ? { serial: normalizeSerial(input.serial) } : {})
    };
}

function uniqueDevices(devices: ExistingDevice[]): ExistingDevice[] {
    return Array.from(new Map(devices.map(device => [device.id, device])).values());
}

export function planWazuhAgentSync(
    inputs: WazuhAgentInput[],
    existingDevices: ExistingDevice[],
    environment: string
): SyncPlanItem[] {
    const seenAgentIds = new Set<string>();

    return inputs.map(input => {
        const agentId = normalizeRequired(input.id, 'agent id');
        const normalizedAgentId = agentId.toLowerCase();
        if (seenAgentIds.has(normalizedAgentId)) {
            throw new Error(`duplicate Wazuh agent id: ${agentId}`);
        }
        seenAgentIds.add(normalizedAgentId);

        if (agentId === '000') {
            return { action: 'skip', agentId, reason: 'manager-pseudo-agent' };
        }

        const candidate = normalizeWazuhAgent(input, environment);
        const identityMatch = existingDevices.find(device =>
            device.identities.some(identity =>
                identity.source === 'wazuh'
                && identity.environment === candidate.externalIdentity.environment
                && identity.type === 'agent_id'
                && identity.normalizedValue === candidate.externalIdentity.normalizedValue
            )
        );

        if (identityMatch) {
            return { action: 'update', agentId, deviceId: identityMatch.id, candidate };
        }

        const systemUuidMatches = candidate.systemUuid
            ? existingDevices.filter(device => normalizeSystemUuid(device.systemUuid) === candidate.systemUuid)
            : [];
        const serialMatches = candidate.serial
            ? existingDevices.filter(device => normalizeSerial(device.serial) === candidate.serial)
            : [];
        const highConfidenceMatches = uniqueDevices([...systemUuidMatches, ...serialMatches]);

        if (highConfidenceMatches.length === 1) {
            const matchedBy = systemUuidMatches.length === 1 ? 'system_uuid' : 'serial';
            return {
                action: 'link',
                agentId,
                deviceId: highConfidenceMatches[0].id,
                matchedBy,
                candidate
            };
        }

        if (highConfidenceMatches.length > 1) {
            return {
                action: 'review',
                agentId,
                candidateDeviceIds: highConfidenceMatches.map(device => device.id).sort(),
                reason: 'conflicting-high-confidence-signals',
                candidate
            };
        }

        const hostnameMatches = existingDevices.filter(
            device => device.hostname.trim().toLowerCase() === candidate.normalizedHostname
        );
        if (hostnameMatches.length > 0) {
            return {
                action: 'review',
                agentId,
                candidateDeviceIds: hostnameMatches.map(device => device.id).sort(),
                reason: 'hostname-only',
                candidate
            };
        }

        return { action: 'create', agentId, candidate };
    });
}
