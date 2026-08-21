# ADR-001: Rebuild Around a Modular UEM Core

Status: Proposed  
Date: 2026-07-25  
Decision owners: IT Manager, PACE-UEM Service Owner  
Reviewers: Infrastructure, Endpoint Engineering, Identity, SOC, Privacy

## Context

The current repository is a useful Wazuh-oriented SOC portal and endpoint
installation package. Its production dashboard is a single Next.js
application. Route handlers authenticate two environment-defined users, query
Wazuh and its indexer, store settings in a JSON file, send notifications, run
diagnostics, and expose security tools.

`SOC_v2` defines a larger service:

- Active Directory integration and RBAC.
- Standard Ubuntu builds and zero-touch provisioning.
- Ansible-controlled configuration.
- Asset lifecycle and device reconciliation.
- Landscape/package/patch operations.
- Wazuh XDR, health monitoring, and Suricata NDR.
- Central logging, audit evidence, retention, backup, and DR.
- Endpoint security baseline and compliance.
- Internal package repository, PKI, and secrets governance.
- Vulnerability remediation and incident response.
- SLA, service ownership, handover, and continual improvement.

Extending the current web process to own all these responsibilities would mix
human identity, CMDB data, secrets, asynchronous ingestion, endpoint control,
security telemetry, and privileged automation in one deployment and one
security boundary.

## Decision

Build a modular application core and migrate the current portal onto it
incrementally.

### Logical components

| Component | Responsibility |
|---|---|
| Reverse proxy | TLS termination, security headers, request limits |
| Identity provider | OIDC, AD federation, MFA policy, group-to-role mapping |
| Next.js portal | User experience and presentation; no direct AD passwords |
| Application API | Assets, devices, findings, workflows, authorization, audit |
| PostgreSQL | CMDB, lifecycle, workflow, integration state, audit records |
| Queue/workers | Wazuh/AD/Landscape synchronization, reports, notifications |
| Wazuh adapter | Read security telemetry and agent state through supported APIs |
| Automation adapter | Submit approved, bounded jobs to Ansible/controller |
| Enrollment service | Device UUID, CSR approval, certificate renewal/revocation |
| Object storage | Reports, signed artifacts, approved evidence and exports |
| Observability | Metrics, logs, traces, alerts, SLOs, capacity |

### System-of-record boundaries

| Information | System of record |
|---|---|
| Human identity, groups, account status | Active Directory |
| Portal sessions and application roles | OIDC provider, derived from AD groups |
| Asset owner, location, assignment, lifecycle | PACE Device Center or selected CMDB |
| Endpoint security events and Wazuh agent state | Wazuh |
| Supported package operations | Landscape |
| Desired endpoint configuration | Version-controlled Ansible |
| Application workflow and immutable audit | PostgreSQL application core |
| Metrics and alert state | Prometheus/Alertmanager or approved equivalent |
| Certificates and revocation | Approved internal PKI |
| Secrets | Approved secrets manager; never normal application settings |

### Initial technology choice

The working baseline follows SOP-009:

- Next.js and TypeScript for the portal.
- A separate modular TypeScript backend.
- PostgreSQL for relational and JSONB data.
- Redis/BullMQ or an equivalent durable job mechanism.
- Keycloak OIDC with read-only AD LDAP federation, unless an existing approved
  identity provider meets the same requirements.
- A small Go inventory agent using outbound mTLS on TCP 443.
- Docker Compose for the pilot; orchestration changes require an explicit scale
  or availability need.

NestJS is the reference backend framework, not an irreversible choice. The
Phase 0 proof must demonstrate validation, OpenAPI generation, authorization,
structured audit, migrations, testing, and operational support before the
framework is confirmed.

## Migration rules

1. The legacy dashboard remains the monitoring fallback during migration.
2. New domain behavior is implemented behind `/api/v1`.
3. Frontend screens are migrated one vertical slice at a time.
4. Wazuh data is linked by external identifiers and timestamps; raw Wazuh
   events are not duplicated into PostgreSQL without a justified use case.
5. Device records are never auto-merged solely by hostname or MAC address.
6. Every state-changing request records actor, role, action, object, before,
   after, request ID, timestamp, and result.
7. Every privileged automation action requires a bounded job definition,
   authorization check, audit event, timeout, and rollback/runbook reference.
8. Destructive containment starts as a manually approved workflow.
9. Database migrations are forward-tested and restore-tested before production.
10. Legacy removal requires parity evidence and a tested rollback.

## Security requirements

- OIDC authorization code flow with PKCE where applicable.
- MFA controlled by identity policy.
- Least-privilege roles: `uem_admin`, `asset_manager`, `support`,
  `security_viewer`, and `auditor` at minimum.
- Read-only LDAP service account for federation.
- No Domain Admin credentials or user LDAP passwords in the application.
- mTLS enrollment with locally generated endpoint private keys.
- Short-lived or renewable certificates with a tested revocation path.
- Encryption in transit for all service connections.
- Secrets mounted or retrieved at runtime, not stored in settings JSON.
- CSRF protection for browser state changes and rate limits at both edge and
  application levels.
- Input schemas, output contracts, dependency scanning, container scanning,
  SBOM, and signed release artifacts.
- Central audit export and retention aligned with SOP-011.

## Consequences

### Benefits

- Clear trust and ownership boundaries.
- Durable asset, workflow, and audit data.
- Independent scaling and retry for integrations.
- Enterprise identity and per-user accountability.
- Testable contracts and safer endpoint automation.
- Incremental migration without monitoring downtime.

### Costs

- More services and operational ownership.
- PostgreSQL, identity, queue, PKI, backup, and worker skills are required.
- Data reconciliation and migration require deliberate pilot work.
- A full production outcome requires multiple disciplines, not only frontend
  implementation.

## Alternatives considered

### Continue expanding the current Next.js application

Rejected for the target state. It minimizes initial work but leaves identity,
persistence, integration jobs, audit, and privileged controls coupled to one
web process.

### Replace the application entirely in one release

Rejected. It creates unnecessary monitoring and rollback risk and discards
reusable Wazuh integration and UI work.

### Deploy GLPI without a custom core

Retained as a Phase 0 decision option. It may accelerate conventional inventory
and asset management, but a proof must establish device identity,
reconciliation, Wazuh/Landscape integration, workflow, OIDC roles, and audit
fit. Custom code must not reproduce capabilities that GLPI already provides.

## Approval gates

ADR approval requires:

- A documented build-versus-GLPI proof.
- Identity proof with mapped test groups and disabled-user behavior.
- Database backup and restore proof.
- Wazuh API compatibility and least-privilege service account proof.
- Privacy approval of the endpoint inventory data dictionary.
- Infrastructure ownership and support acceptance.
