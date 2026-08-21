# PACE SOC / UEM Rebuild Program

Status: Phase 0 - discovery and architecture approval  
Decision owner: IT Manager / PACE-UEM Service Owner  
Technical owners: Endpoint Engineering, SOC, Infrastructure, Identity  
Baseline date: 2026-07-25

## Objective

Evolve the current Wazuh-focused SOC dashboard and agent deployment tooling into
the PACE Unified Endpoint Management operating model defined by `SOC_v2`,
without interrupting current monitoring.

This is a controlled rebuild around reusable current capabilities. It is not a
big-bang replacement and it is not an attempt to implement all 20 SOPs inside
the existing Next.js process.

## Approved working direction

1. Keep the current dashboard operational as the migration baseline.
2. Reuse its Wazuh integrations, visual components, detection mappings, agent
   tests, CI/CD, immutable images, TLS proxy, health checks, and rollback flow.
3. Introduce a separate application API, PostgreSQL system of record,
   background workers, OIDC identity, and immutable application audit.
4. Make the portal consume versioned APIs instead of directly owning every
   integration and privileged operation.
5. Roll out through LAB, PILOT, and PRODUCTION gates.
6. Retire legacy routes only after parity, reconciliation, restore, and
   rollback tests have passed.

## Documents

- [ADR-001-target-architecture.md](ADR-001-target-architecture.md) records the
  rebuild decision, target boundaries, and migration rules.
- [requirements-traceability.md](requirements-traceability.md) maps every
  `SOC_v2` SOP to current evidence, gaps, target ownership, and acceptance
  evidence.
- [delivery-roadmap.md](delivery-roadmap.md) defines phases, gates, backlog,
  risks, metrics, and the first two-week sprint.
- [current-state.md](current-state.md) records the repository-verified topology,
  data flows, and production facts that require owner validation.
- [threat-model.md](threat-model.md) records trust boundaries, security
  invariants, threats, controls, and verification requirements.
- [api-disposition.md](api-disposition.md) classifies every current API route
  for retention, migration, redesign, or removal.
- [engineering-conventions.md](engineering-conventions.md) defines proposed
  backend modules, database migrations, jobs, quality, backup, and recovery
  conventions.
- [sprint-1-status.md](sprint-1-status.md) separates completed repository work
  from discovery evidence and approvals still required from system owners.
- [audit-contract.md](audit-contract.md) defines request correlation,
  attribution, redaction, action naming, and the transition to durable audit.

## Foundation implementation

- `apps/api/openapi.yaml` defines the initial framework-neutral `/api/v1`
  contract.
- `platform/database` contains the first transactional PostgreSQL migration and
  database verification script.
- `platform/compose/pilot-database.yml` provides an isolated, loopback-only
  pilot database definition using an explicitly selected image.
- `platform/tests` guards key API, schema, and immutable-audit requirements.
- [foundation-status.md](foundation-status.md) records implemented foundation
  controls, validation results, and infrastructure-dependent live checks.
- [wazuh-sync-contract.md](wazuh-sync-contract.md) defines safe device identity
  precedence, reconciliation actions, and durable-worker requirements.
- [reconciliation-workflow.md](reconciliation-workflow.md) defines the
  versioned, role-controlled workflow for resolving ambiguous device matches.
- [integration-worker-contract.md](integration-worker-contract.md) defines
  deterministic idempotency, retry/dead-letter states, counts, cursor, and
  transaction requirements for durable integrations.
- [identity-contract.md](identity-contract.md) defines the cryptographic OIDC
  adapter boundary, claim checks, explicit AD-group mapping, and authorization.

## Scope controls

The program will not:

- Replace Wazuh, Landscape, Active Directory, Ansible, or the corporate
  firewall with custom equivalents.
- Store Active Directory user passwords in the application.
- Enable automatic endpoint isolation before manual containment is tested and
  approved.
- Deploy unreviewed changes directly to all endpoints.
- Treat a successful installation as service acceptance without restore,
  security, operational ownership, and evidence.
- Copy real credentials, tokens, private keys, or production configuration into
  Git.

## Phase 0 exit criteria

Phase 0 is complete only when all items below have named owners and recorded
evidence:

- Current production topology and version inventory.
- Endpoint population and supported operating-system matrix.
- AD, DNS, time, OU, group, and delegated-account readiness.
- Identity decision: Keycloak federation or approved equivalent.
- Asset platform decision: custom Device Center, GLPI, or hybrid.
- Existing Landscape, AD CS/PKI, Prometheus/Grafana, Suricata, backup, object
  storage, secrets manager, and ticketing capabilities.
- Data classification, privacy boundary, and retention requirements.
- Target RPO/RTO and tested restore responsibility.
- Pilot endpoint list and business-owner approval.
- Staffing, delivery budget, and production change windows.
- Approval of ADR-001 and the MVP definition in the roadmap.

Until these gates are approved, implementation is limited to reversible
foundation work, tests, local development scaffolding, and read-only
integration proofs.
