# Platform Foundation Status

Status date: 2026-07-25  
Scope: Framework-neutral RB-101/RB-102 foundation

## Implemented

- Initial OpenAPI 3.1 contract under `apps/api/openapi.yaml`.
- OIDC security scheme and operation-level target roles.
- Liveness and readiness contracts.
- Device list/detail and immutable audit-query contracts.
- Cursor pagination bounded to 200 records.
- Stable problem-details and request-ID response contracts.
- Transactional PostgreSQL core migration.
- Assets, devices, multi-source identities, inventory snapshots, security
  findings, integration cursors, and audit events.
- Database-level prevention of audit updates and deletes.
- Migration verification SQL for relationships and audit immutability.
- Loopback-only pilot PostgreSQL port and internal Compose network.
- Required explicit database password and selected PostgreSQL image.
- CI/release guard tests for contract and migration invariants.
- Pure Wazuh agent normalization and deterministic reconciliation planning.
- Bounded Wazuh agent-page validation before reconciliation planning.
- Validated response-to-batch boundary with source-total propagation.
- Bounded Wazuh retry/backoff and terminal-failure policy.
- Stable bounded Wazuh pagination with no-progress and consistency guards.
- CI/release tests and TypeScript checks for Wazuh synchronization rules.
- Durable integration-run and reconciliation-queue schema.
- API contracts for reconciliation review and versioned decisions.
- Role-controlled decision state machine with optimistic concurrency,
  candidate restrictions, justification, effects, and audit output.
- Deterministic integration idempotency keys and Wazuh batch envelopes.
- Bounded integration retry, completion-count, and dead-letter state machine.
- Verified OIDC claims-context validation for issuer, audience, token times,
  subject, username, and groups.
- Explicit AD-group-to-application-role mapping that ignores arbitrary role
  claims and fails closed for unmapped users.

## Validation

| Check | Result |
|---|---|
| Foundation contract/migration guards | Passed |
| Wazuh and reconciliation domain tests | Passed |
| Integration replay/retry/dead-letter tests | Passed |
| OIDC claim and role-negative tests | Passed |
| Dashboard tests | Passed |
| Dashboard TypeScript check | Passed |
| Diff whitespace check | Passed |
| Docker Compose rendering | Not run: Docker CLI is unavailable in this workspace |
| Live PostgreSQL migration/verification | Not run: requires approved pilot container/runtime |

Static guards do not replace executing the migration against the selected
PostgreSQL image. The live database gate must run:

1. Compose configuration rendering.
2. Fresh database initialization.
3. `platform/database/verify/0001_core.sql`.
4. Backup.
5. Destructive test data change.
6. Restore into an isolated database.
7. Integrity and application-query verification.

## Deliberately deferred

- Runtime backend framework.
- OIDC issuer/client configuration.
- Database application and migration roles.
- Production image/digest selection.
- Durable Wazuh synchronization worker.
- PostgreSQL backup implementation and approved RPO/RTO.
- Production hosting, HA, monitoring, and secret delivery.

These depend on Gate A/B ownership and infrastructure evidence. The current
artifacts are safe to retain regardless of the selected TypeScript framework.
