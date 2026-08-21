import type { UserRole } from './token';

const SENSITIVE_KEY_PATTERN = /password|secret|token|authorization|cookie|api[-_]?key|private[-_]?key/i;

export type AuditOutcome = 'success' | 'failure' | 'denied';

export interface AuditActor {
    username: string;
    role: UserRole | 'system' | 'unknown';
}

export interface SecurityAuditEvent {
    schemaVersion: 1;
    timestamp: string;
    requestId: string;
    actor: AuditActor;
    action: string;
    target: {
        type: string;
        id?: string;
    };
    outcome: AuditOutcome;
    sourceIp?: string;
    metadata?: Record<string, unknown>;
}

interface CreateAuditEventInput {
    requestId: string;
    actor: AuditActor;
    action: string;
    target: SecurityAuditEvent['target'];
    outcome: AuditOutcome;
    sourceIp?: string;
    metadata?: Record<string, unknown>;
    timestamp?: string;
}

function redactValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(redactValue);
    if (!value || typeof value !== 'object') return value;

    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
            key,
            SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : redactValue(entry)
        ])
    );
}

export function sanitizeAuditMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    return metadata ? redactValue(metadata) as Record<string, unknown> : undefined;
}

export function createSecurityAuditEvent(input: CreateAuditEventInput): SecurityAuditEvent {
    return {
        schemaVersion: 1,
        timestamp: input.timestamp || new Date().toISOString(),
        requestId: input.requestId,
        actor: input.actor,
        action: input.action,
        target: input.target,
        outcome: input.outcome,
        ...(input.sourceIp ? { sourceIp: input.sourceIp } : {}),
        ...(input.metadata ? { metadata: sanitizeAuditMetadata(input.metadata) } : {})
    };
}

export function auditActorFromHeaders(headers: Headers): AuditActor {
    const username = headers.get('x-authenticated-user') || 'unknown';
    const role = headers.get('x-authenticated-role');

    return {
        username,
        role: role === 'admin' || role === 'analyst' ? role : 'unknown'
    };
}

export function emitSecurityAudit(event: SecurityAuditEvent): void {
    console.info(`[SECURITY_AUDIT] ${JSON.stringify(event)}`);
}
