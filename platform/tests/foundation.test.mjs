import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const openApi = readFileSync(new URL('../../apps/api/openapi.yaml', import.meta.url), 'utf8');
const migration = readFileSync(
    new URL('../database/migrations/0001_core.sql', import.meta.url),
    'utf8'
);
const verification = readFileSync(
    new URL('../database/verify/0001_core.sql', import.meta.url),
    'utf8'
);
const reconciliationMigration = readFileSync(
    new URL('../database/migrations/0002_reconciliation.sql', import.meta.url),
    'utf8'
);
const reconciliationVerification = readFileSync(
    new URL('../database/verify/0002_reconciliation.sql', import.meta.url),
    'utf8'
);

test('API v1 contract declares identity, request correlation, and bounded collections', () => {
    assert.match(openApi, /^openapi: 3\.1\.0/m);
    assert.match(openApi, /^  \/devices:$/m);
    assert.match(openApi, /^  \/audit-events:$/m);
    assert.match(openApi, /^  \/reconciliation-items:$/m);
    assert.match(openApi, /^  \/reconciliation-items\/\{reconciliationItemId\}\/decision:$/m);
    assert.match(openApi, /openIdConnectUrl:/);
    assert.match(openApi, /x-request-id:/);
    assert.match(openApi, /maximum: 200/);
    assert.match(openApi, /application\/problem\+json:/);
});

test('core migration is transactional and creates required system-of-record tables', () => {
    assert.match(migration, /^BEGIN;$/m);
    assert.match(migration, /^COMMIT;$/m);

    for (const table of [
        'assets',
        'devices',
        'device_identities',
        'inventory_snapshots',
        'security_findings',
        'integration_cursors',
        'audit_events'
    ]) {
        assert.match(migration, new RegExp(`CREATE TABLE ${table} \\(`));
    }
});

test('audit storage is protected from update and delete', () => {
    assert.match(migration, /CREATE TRIGGER audit_events_no_update/);
    assert.match(migration, /CREATE TRIGGER audit_events_no_delete/);
    assert.match(migration, /RAISE EXCEPTION 'audit_events is append-only'/);
    assert.match(verification, /UPDATE audit_events/);
    assert.match(verification, /DELETE FROM audit_events/);
    assert.match(verification, /^ROLLBACK;$/m);
});

test('database schema excludes obvious secret-bearing columns', () => {
    assert.doesNotMatch(migration, /^\s*(password|secret|token|private_key)\s+/mi);
    assert.doesNotMatch(reconciliationMigration, /^\s*(password|secret|token|private_key)\s+/mi);
});

test('reconciliation migration enforces idempotent runs and one pending source item', () => {
    assert.match(reconciliationMigration, /CREATE TABLE integration_runs/);
    assert.match(reconciliationMigration, /CREATE TABLE reconciliation_items/);
    assert.match(reconciliationMigration, /UNIQUE \(integration, environment, stream, idempotency_key\)/);
    assert.match(reconciliationMigration, /CREATE UNIQUE INDEX reconciliation_items_pending_source_uq/);
    assert.match(reconciliationMigration, /WHERE status = 'pending'/);
    assert.match(reconciliationVerification, /WHEN unique_violation/);
});
