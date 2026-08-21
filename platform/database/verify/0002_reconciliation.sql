\set ON_ERROR_STOP on

BEGIN;

INSERT INTO integration_runs (
    integration,
    environment,
    stream,
    idempotency_key,
    state,
    planned_count,
    review_count
)
VALUES (
    'wazuh',
    'test',
    'agents',
    'verify-0002',
    'succeeded',
    1,
    1
);

INSERT INTO reconciliation_items (
    integration_run_id,
    source,
    environment,
    source_external_id,
    reason,
    candidate_payload
)
SELECT
    id,
    'wazuh',
    'test',
    'agent-verify-0002',
    'hostname-only',
    '{"hostname":"verify-device"}'::jsonb
FROM integration_runs
WHERE idempotency_key = 'verify-0002';

DO $$
BEGIN
    BEGIN
        INSERT INTO reconciliation_items (
            integration_run_id,
            source,
            environment,
            source_external_id,
            reason,
            candidate_payload
        )
        SELECT
            id,
            'wazuh',
            'test',
            'agent-verify-0002',
            'hostname-only',
            '{}'::jsonb
        FROM integration_runs
        WHERE idempotency_key = 'verify-0002';
        RAISE EXCEPTION 'duplicate pending reconciliation item unexpectedly succeeded';
    EXCEPTION
        WHEN unique_violation THEN
            NULL;
    END;
END;
$$;

ROLLBACK;
