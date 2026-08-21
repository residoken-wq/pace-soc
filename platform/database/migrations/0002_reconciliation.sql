BEGIN;

CREATE TABLE integration_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    integration text NOT NULL,
    environment text NOT NULL,
    stream text NOT NULL,
    idempotency_key text NOT NULL,
    source_cursor text,
    state text NOT NULL DEFAULT 'pending'
        CHECK (state IN ('pending', 'running', 'succeeded', 'failed', 'dead_letter')),
    attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
    planned_count integer NOT NULL DEFAULT 0 CHECK (planned_count >= 0),
    applied_count integer NOT NULL DEFAULT 0 CHECK (applied_count >= 0),
    review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    error_code text,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT integration_runs_identity_uq
        UNIQUE (integration, environment, stream, idempotency_key),
    CONSTRAINT integration_runs_fields_nonempty CHECK (
        btrim(integration) <> ''
        AND btrim(environment) <> ''
        AND btrim(stream) <> ''
        AND btrim(idempotency_key) <> ''
    ),
    CONSTRAINT integration_runs_applied_not_above_planned CHECK (applied_count <= planned_count),
    CONSTRAINT integration_runs_review_not_above_planned CHECK (review_count <= planned_count)
);

CREATE INDEX integration_runs_state_created_idx
    ON integration_runs (state, created_at);
CREATE INDEX integration_runs_stream_created_idx
    ON integration_runs (integration, environment, stream, created_at DESC);

CREATE TABLE reconciliation_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_run_id uuid NOT NULL REFERENCES integration_runs(id) ON DELETE RESTRICT,
    source text NOT NULL,
    environment text NOT NULL,
    source_external_id text NOT NULL,
    reason text NOT NULL
        CHECK (reason IN ('hostname-only', 'conflicting-high-confidence-signals')),
    candidate_device_ids uuid[] NOT NULL DEFAULT '{}',
    candidate_payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'resolved', 'dismissed')),
    decision text
        CHECK (decision IS NULL OR decision IN ('link_existing', 'create_new', 'dismiss')),
    selected_device_id uuid REFERENCES devices(id) ON DELETE RESTRICT,
    decided_by text,
    decision_justification text,
    decided_at timestamptz,
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reconciliation_items_source_nonempty CHECK (
        btrim(source) <> ''
        AND btrim(environment) <> ''
        AND btrim(source_external_id) <> ''
    ),
    CONSTRAINT reconciliation_items_resolution_consistent CHECK (
        (
            status = 'pending'
            AND decision IS NULL
            AND selected_device_id IS NULL
            AND decided_by IS NULL
            AND decided_at IS NULL
        )
        OR
        (
            status = 'resolved'
            AND decision IN ('link_existing', 'create_new')
            AND decided_by IS NOT NULL
            AND decided_at IS NOT NULL
            AND (
                (decision = 'link_existing' AND selected_device_id IS NOT NULL)
                OR
                (decision = 'create_new' AND selected_device_id IS NULL)
            )
        )
        OR
        (
            status = 'dismissed'
            AND decision = 'dismiss'
            AND selected_device_id IS NULL
            AND decided_by IS NOT NULL
            AND decided_at IS NOT NULL
        )
    )
);

CREATE UNIQUE INDEX reconciliation_items_pending_source_uq
    ON reconciliation_items (source, environment, source_external_id)
    WHERE status = 'pending';
CREATE INDEX reconciliation_items_status_created_idx
    ON reconciliation_items (status, created_at);
CREATE INDEX reconciliation_items_run_idx
    ON reconciliation_items (integration_run_id);

COMMIT;
