export type ReconciliationRole = 'uem_admin' | 'asset_manager' | 'support' | 'security_viewer' | 'auditor';
export type ReconciliationDecision = 'link_existing' | 'create_new' | 'dismiss';

export interface ReconciliationItem {
    id: string;
    status: 'pending' | 'resolved' | 'dismissed';
    reason: 'hostname-only' | 'conflicting-high-confidence-signals';
    candidateDeviceIds: string[];
    version: number;
}

export interface ReconciliationDecisionCommand {
    decision: ReconciliationDecision;
    selectedDeviceId?: string;
    justification: string;
    expectedVersion: number;
    actor: {
        username: string;
        role: ReconciliationRole;
    };
}

export interface ReconciliationDecisionResult {
    item: ReconciliationItem & {
        status: 'resolved' | 'dismissed';
        decision: ReconciliationDecision;
        selectedDeviceId?: string;
        decidedBy: string;
        decisionJustification: string;
        version: number;
    };
    effect:
        | { type: 'link-existing'; deviceId: string }
        | { type: 'create-new' }
        | { type: 'none' };
    audit: {
        action: 'device.reconciliation.decide';
        target: { type: 'reconciliation-item'; id: string };
        outcome: 'success';
        metadata: {
            decision: ReconciliationDecision;
            previousVersion: number;
            newVersion: number;
        };
    };
}

export class ReconciliationDecisionError extends Error {
    public readonly code: 'forbidden' | 'conflict' | 'invalid-decision';

    constructor(
        code: 'forbidden' | 'conflict' | 'invalid-decision',
        message: string
    ) {
        super(message);
        this.name = 'ReconciliationDecisionError';
        this.code = code;
    }
}

export function decideReconciliationItem(
    current: ReconciliationItem,
    command: ReconciliationDecisionCommand
): ReconciliationDecisionResult {
    if (command.actor.role !== 'uem_admin' && command.actor.role !== 'asset_manager') {
        throw new ReconciliationDecisionError('forbidden', 'role cannot decide reconciliation items');
    }
    if (current.status !== 'pending' || current.version !== command.expectedVersion) {
        throw new ReconciliationDecisionError('conflict', 'reconciliation item changed or is already decided');
    }

    const justification = command.justification.trim();
    if (justification.length < 10) {
        throw new ReconciliationDecisionError(
            'invalid-decision',
            'decision justification must contain at least 10 characters'
        );
    }

    let effect: ReconciliationDecisionResult['effect'];
    let selectedDeviceId: string | undefined;
    if (command.decision === 'link_existing') {
        if (!command.selectedDeviceId || !current.candidateDeviceIds.includes(command.selectedDeviceId)) {
            throw new ReconciliationDecisionError(
                'invalid-decision',
                'selected device must be one of the reviewed candidates'
            );
        }
        selectedDeviceId = command.selectedDeviceId;
        effect = { type: 'link-existing', deviceId: selectedDeviceId };
    } else if (command.decision === 'create_new') {
        if (command.selectedDeviceId) {
            throw new ReconciliationDecisionError(
                'invalid-decision',
                'create_new cannot include a selected device'
            );
        }
        effect = { type: 'create-new' };
    } else {
        if (command.selectedDeviceId) {
            throw new ReconciliationDecisionError(
                'invalid-decision',
                'dismiss cannot include a selected device'
            );
        }
        effect = { type: 'none' };
    }

    const newVersion = current.version + 1;
    return {
        item: {
            ...current,
            status: command.decision === 'dismiss' ? 'dismissed' : 'resolved',
            decision: command.decision,
            ...(selectedDeviceId ? { selectedDeviceId } : {}),
            decidedBy: command.actor.username,
            decisionJustification: justification,
            version: newVersion
        },
        effect,
        audit: {
            action: 'device.reconciliation.decide',
            target: { type: 'reconciliation-item', id: current.id },
            outcome: 'success',
            metadata: {
                decision: command.decision,
                previousVersion: current.version,
                newVersion
            }
        }
    };
}
