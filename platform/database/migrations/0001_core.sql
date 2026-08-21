BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_tag text NOT NULL,
    category text NOT NULL,
    status text NOT NULL DEFAULT 'in_stock'
        CHECK (status IN ('in_stock', 'assigned', 'repair', 'lost', 'retired', 'disposed')),
    owner_external_id text,
    department_external_id text,
    location_external_id text,
    purchased_on date,
    warranty_expires_on date,
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT assets_asset_tag_nonempty CHECK (btrim(asset_tag) <> '')
);

CREATE UNIQUE INDEX assets_asset_tag_uq ON assets (lower(asset_tag));
CREATE INDEX assets_status_idx ON assets (status);

CREATE TABLE devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_uuid uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
    hostname text NOT NULL,
    fqdn text,
    serial text,
    system_uuid uuid,
    os_name text,
    os_version text,
    kernel_version text,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'inactive', 'retired', 'quarantined')),
    health_status text NOT NULL DEFAULT 'unknown'
        CHECK (health_status IN ('unknown', 'healthy', 'warning', 'critical')),
    last_seen_at timestamptz,
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT devices_hostname_nonempty CHECK (btrim(hostname) <> '')
);

CREATE UNIQUE INDEX devices_serial_valid_uq
    ON devices (lower(serial))
    WHERE serial IS NOT NULL
      AND btrim(serial) <> ''
      AND lower(btrim(serial)) NOT IN ('to be filled by o.e.m.', 'default string', 'unknown', 'none');
CREATE UNIQUE INDEX devices_system_uuid_uq
    ON devices (system_uuid)
    WHERE system_uuid IS NOT NULL;
CREATE INDEX devices_asset_id_idx ON devices (asset_id);
CREATE INDEX devices_status_last_seen_idx ON devices (status, last_seen_at DESC);
CREATE INDEX devices_hostname_idx ON devices (lower(hostname));

CREATE TABLE device_identities (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    source text NOT NULL,
    environment text NOT NULL DEFAULT 'production',
    identity_type text NOT NULL,
    identity_value text NOT NULL,
    normalized_value text NOT NULL,
    verified_at timestamptz,
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT device_identities_fields_nonempty CHECK (
        btrim(source) <> ''
        AND btrim(environment) <> ''
        AND btrim(identity_type) <> ''
        AND btrim(normalized_value) <> ''
    ),
    UNIQUE (source, environment, identity_type, normalized_value)
);

CREATE INDEX device_identities_device_idx ON device_identities (device_id);

CREATE TABLE inventory_snapshots (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    collected_at timestamptz NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now(),
    schema_version text NOT NULL,
    payload jsonb NOT NULL,
    payload_sha256 text NOT NULL,
    CONSTRAINT inventory_snapshots_hash_format CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
    UNIQUE (device_id, payload_sha256)
);

CREATE INDEX inventory_snapshots_device_time_idx
    ON inventory_snapshots (device_id, collected_at DESC);

CREATE TABLE security_findings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id uuid REFERENCES devices(id) ON DELETE SET NULL,
    source text NOT NULL,
    environment text NOT NULL DEFAULT 'production',
    external_id text NOT NULL,
    finding_type text NOT NULL,
    title text NOT NULL,
    severity text NOT NULL
        CHECK (severity IN ('informational', 'low', 'medium', 'high', 'critical')),
    state text NOT NULL DEFAULT 'open'
        CHECK (state IN ('open', 'triaged', 'in_progress', 'resolved', 'accepted', 'false_positive')),
    owner_external_id text,
    due_at timestamptz,
    first_seen_at timestamptz NOT NULL,
    last_seen_at timestamptz NOT NULL,
    resolved_at timestamptz,
    source_payload jsonb,
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT security_findings_source_identity_uq
        UNIQUE (source, environment, external_id)
);

CREATE INDEX security_findings_device_state_idx
    ON security_findings (device_id, state, severity);
CREATE INDEX security_findings_due_open_idx
    ON security_findings (due_at)
    WHERE state IN ('open', 'triaged', 'in_progress');

CREATE TABLE integration_cursors (
    integration text NOT NULL,
    environment text NOT NULL DEFAULT 'production',
    stream text NOT NULL,
    cursor_value text,
    last_attempt_at timestamptz,
    last_success_at timestamptz,
    last_error_code text,
    consecutive_failures integer NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (integration, environment, stream)
);

CREATE TABLE audit_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    request_id uuid NOT NULL,
    actor text NOT NULL,
    actor_role text,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text,
    outcome text NOT NULL CHECK (outcome IN ('success', 'failure', 'denied')),
    source_ip inet,
    before_state jsonb,
    after_state jsonb,
    metadata jsonb,
    CONSTRAINT audit_events_required_text CHECK (
        btrim(actor) <> ''
        AND btrim(action) <> ''
        AND btrim(target_type) <> ''
    )
);

CREATE INDEX audit_events_occurred_idx ON audit_events (occurred_at DESC, id DESC);
CREATE INDEX audit_events_request_idx ON audit_events (request_id);
CREATE INDEX audit_events_actor_idx ON audit_events (actor, occurred_at DESC);
CREATE INDEX audit_events_target_idx ON audit_events (target_type, target_id, occurred_at DESC);

CREATE FUNCTION prevent_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

CREATE TRIGGER audit_events_no_update
BEFORE UPDATE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();

CREATE TRIGGER audit_events_no_delete
BEFORE DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();

COMMIT;
