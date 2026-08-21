import type { ExistingDevice, SyncPlanItem, WazuhAgentInput } from './agent-sync.ts';
import { planWazuhAgentSync } from './agent-sync.ts';
import { parseWazuhAgentPage } from './agent-page.ts';
import { createIntegrationRun, type IntegrationRun } from '../run-state.ts';

export interface WazuhSyncBatch {
    run: IntegrationRun;
    sourceCursor: string;
    sourceTotalCount?: number;
    plans: SyncPlanItem[];
    skippedCount: number;
}

export interface BuildWazuhSyncBatchInput {
    agents: WazuhAgentInput[];
    existingDevices: ExistingDevice[];
    environment: string;
    sourceCursor: string;
    maxAttempts?: number;
}

export function buildWazuhSyncBatch(input: BuildWazuhSyncBatchInput): WazuhSyncBatch {
    const plans = planWazuhAgentSync(input.agents, input.existingDevices, input.environment);
    const actionablePlans = plans.filter(plan => plan.action !== 'skip');

    return {
        run: createIntegrationRun({
            integration: 'wazuh',
            environment: input.environment,
            stream: 'agents',
            sourceCursor: input.sourceCursor,
            plannedCount: actionablePlans.length,
            maxAttempts: input.maxAttempts
        }),
        sourceCursor: input.sourceCursor,
        plans,
        skippedCount: plans.length - actionablePlans.length
    };
}

export function buildWazuhSyncBatchFromResponse(input: {
    response: unknown;
    existingDevices: ExistingDevice[];
    environment: string;
    sourceCursor: string;
    maxPageSize?: number;
    maxAttempts?: number;
}): WazuhSyncBatch {
    const page = parseWazuhAgentPage(input.response, input.maxPageSize);
    const batch = buildWazuhSyncBatch({
        agents: page.agents,
        existingDevices: input.existingDevices,
        environment: input.environment,
        sourceCursor: input.sourceCursor,
        maxAttempts: input.maxAttempts
    });

    return {
        ...batch,
        sourceTotalCount: page.totalAffectedItems
    };
}
