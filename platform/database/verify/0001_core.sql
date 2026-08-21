\set ON_ERROR_STOP on

BEGIN;

INSERT INTO assets (asset_tag, category)
VALUES ('TEST-ASSET-001', 'workstation');

INSERT INTO devices (hostname, asset_id, status)
SELECT 'test-device-001', id, 'active'
FROM assets
WHERE asset_tag = 'TEST-ASSET-001';

INSERT INTO device_identities (
    device_id,
    source,
    environment,
    identity_type,
    identity_value,
    normalized_value,
    verified_at
)
SELECT
    id,
    'wazuh',
    'test',
    'agent_id',
    '001',
    '001',
    now()
FROM devices
WHERE hostname = 'test-device-001';

INSERT INTO audit_events (
    request_id,
    actor,
    actor_role,
    action,
    target_type,
    target_id,
    outcome
)
VALUES (
    '018f8f72-8b4f-7ab4-9d2f-9d1f67a51342',
    'foundation-test',
    'system',
    'database.verify',
    'migration',
    '0001_core',
    'success'
);

DO $$
BEGIN
    BEGIN
        UPDATE audit_events
        SET outcome = 'failure'
        WHERE action = 'database.verify';
        RAISE EXCEPTION 'audit update unexpectedly succeeded';
    EXCEPTION
        WHEN raise_exception THEN
            IF SQLERRM <> 'audit_events is append-only' THEN
                RAISE;
            END IF;
    END;

    BEGIN
        DELETE FROM audit_events
        WHERE action = 'database.verify';
        RAISE EXCEPTION 'audit delete unexpectedly succeeded';
    EXCEPTION
        WHEN raise_exception THEN
            IF SQLERRM <> 'audit_events is append-only' THEN
                RAISE;
            END IF;
    END;
END;
$$;

ROLLBACK;
