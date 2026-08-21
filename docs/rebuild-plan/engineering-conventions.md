# Backend, Database, and Recovery Conventions

Status: Proposed for Sprint 1 review

## Repository structure

The target monorepo structure is:

```text
apps/
  portal/          Next.js user interface
  api/             Application API
  worker/          Integration and scheduled jobs
agents/
  inventory/       Go endpoint inventory agent
packages/
  contracts/       OpenAPI-generated/shared contract types
  authz/           Role and policy definitions
  observability/   Logging, metrics and trace conventions
infra/
  compose/         Pilot deployment
  migrations/      Infrastructure evolution where applicable
  monitoring/      Dashboards and alert rules
automation/
  ansible/         Inventories, roles and playbooks
docs/
  architecture/
  operations/
  security/
```

This structure is a target for new platform code. Moving the existing dashboard
is deferred until the first vertical slice proves the API boundary.

## Backend module boundaries

- `identity`: OIDC claims, role mapping and user references.
- `assets`: asset tags, ownership, assignment, location and lifecycle.
- `devices`: device identity, inventory, health and reconciliation.
- `findings`: normalized external findings and remediation workflow.
- `integrations`: Wazuh, AD, Landscape and monitoring adapters/cursors.
- `jobs`: approved asynchronous operations and delivery state.
- `audit`: append-only application audit and export.
- `configuration`: non-secret configuration and secret references.
- `enrollment`: CSR approval, certificate state and revocation.

Modules access one another through explicit services/contracts, not direct
cross-module table writes.

## PostgreSQL conventions

- UUID primary keys for business entities; big integers may be used for
  append-only event/snapshot sequences.
- `timestamptz` in UTC for all stored timestamps.
- `created_at` and `updated_at` on mutable entities.
- Optimistic concurrency/version field for operator-edited workflow records.
- External identity is unique on `(source, external_id, environment)`.
- Foreign keys are required; delete behavior is explicit.
- Inventory snapshots and audit events are append-only.
- JSONB is allowed for source payloads/snapshots, not as a substitute for
  queryable lifecycle fields.
- Secrets, access tokens, passwords and private keys are prohibited.
- Human-readable status values use constrained enums/checks and documented
  transitions.
- Migrations are immutable after merge and use one ordered migration history.
- Application roles do not receive database-owner or schema-owner privileges.

## Migration rules

Each migration must include:

- Purpose and affected tables/indexes.
- Forward execution test from an empty database.
- Upgrade test from the previous supported version.
- Lock/duration assessment for production-size data.
- Data backfill strategy where required.
- Recovery approach. Destructive schema rollback is not assumed to be safe.

Production deployment uses expand/migrate/contract:

1. Add backward-compatible schema.
2. Deploy code supporting old and new forms.
3. Backfill and verify.
4. Switch reads/writes.
5. Remove obsolete schema in a later approved release.

## Backup and recovery

Minimum protected data:

- PostgreSQL base backups and WAL needed for the approved recovery point.
- Identity-provider configuration that cannot be reproduced from code.
- Queue configuration; business jobs must also be reconstructible from
  PostgreSQL state.
- Object storage containing approved evidence and reports.
- Runtime configuration and secret references.
- PKI material explicitly approved for backup.
- Version-controlled source, migrations, Ansible and deployment configuration.

Acceptance rules:

- Backup encryption keys have named custody and recovery.
- Restore occurs into an isolated environment.
- Database integrity, row counts, critical workflows, audit continuity and
  object references are verified after restore.
- Measured RPO and RTO are recorded.
- A backup job without a successful scenario restore is not “green.”

## Integration job conventions

- Unique job type and version.
- Idempotency key and correlation/request ID.
- Bounded target set and payload size.
- Maximum attempts, exponential backoff and deadline.
- Dead-letter state with an operator-visible reason.
- No secret values in payload, logs or audit.
- Explicit actor: user, schedule or service identity.
- Before/after/result audit for state-changing external jobs.
- Circuit breaking for unavailable dependencies.
- Visible last-success, last-attempt, lag and stale-data state.

## Quality gates

New security/domain code requires:

- Unit tests for decisions and transformations.
- API authorization tests including negative cases.
- External-adapter contract fixtures.
- Database migration and repository integration tests.
- Structured lint/type checks with no new warnings.
- Dependency, secret, container and SBOM checks.
- Production build and smoke test.
- Restore test for releases changing persistence.

Coverage percentages are diagnostic, not the sole gate. Authentication,
authorization, reconciliation, workflow transitions, idempotency, and audit
paths require explicit behavior tests.
