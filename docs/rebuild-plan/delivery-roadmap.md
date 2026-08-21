# Delivery Roadmap

## Program outcome

Deliver an operable PACE-UEM service for the approved endpoint population with
enterprise identity, reconciled assets, security visibility, controlled
automation, remediation workflows, audit evidence, backup/recovery, and named
service ownership.

Planning assumption: 150 endpoints, Ubuntu 24.04 as the primary managed
platform, existing Wazuh retained, and incremental production rollout.

## MVP definition

The first production MVP includes:

- OIDC login federated to AD.
- API-enforced RBAC.
- PostgreSQL assets, devices, identities, assignments, findings, and audit.
- Wazuh agent/finding synchronization.
- AD computer and group synchronization.
- Device search/detail and reconciliation queue.
- Inventory-agent enrollment proof using device UUID and mTLS.
- Vulnerability owner, status, due date, exception, and verification workflow.
- Structured monitoring, backup, restore, and operational runbooks.

PXE, full Landscape workflows, Suricata production rollout, automated
containment, 802.1X, SSH CA, and advanced reporting may follow the MVP unless
Phase 0 identifies them as immediate dependencies.

## Phases and gates

| Phase | Duration | Deliverables | Exit gate |
|---|---:|---|---|
| 0. Discovery | 2-3 weeks | Inventory, decisions, owners, requirements, pilot scope | Architecture and MVP signed |
| 1. Stabilize | 2-4 weeks | Tests, validation, audit, secret cleanup, current backup | Monitoring baseline is safe |
| 2. Foundation | 4-6 weeks | OIDC, API, PostgreSQL, queue, audit, observability | Security and restore review passed |
| 3. Device Center MVP | 5-7 weeks | Assets, devices, reconciliation, AD/Wazuh adapters, portal slices | 10-20 endpoint pilot accepted |
| 4. Endpoint control | 4-6 weeks | Enrollment, signed agent/package, Ansible baseline, rollout rings | Revocation and rollback passed |
| 5. Workflows | 6-8 weeks | Remediation, incidents, compliance, notifications, SLOs | Operational acceptance passed |
| 6. Transition | 2-4 weeks | Parallel run, DR exercise, training, legacy freeze/removal | Service owner signs handover |

Phases may overlap after their dependency gates pass. Production-impacting
activities never overlap merely to recover schedule.

## Phase 0 discovery register

| ID | Question | Required owner | Evidence/output |
|---|---|---|---|
| D-01 | What services, versions, addresses, certificates and dependencies run in production? | Infrastructure | Current-state diagram and inventory |
| D-02 | How many endpoints exist by OS, location, owner and criticality? | Asset/Helpdesk | Approved endpoint inventory |
| D-03 | Which AD OUs, groups, service accounts and policies already exist? | AD | Export and least-privilege review |
| D-04 | Is an approved OIDC provider already available? | Identity | Product and federation decision |
| D-05 | Does PACE have GLPI or another authoritative CMDB? | IT Manager | Build/adopt/hybrid decision |
| D-06 | Is Landscape licensed and deployed? | Endpoint Ops | Version, license and topology |
| D-07 | Does AD CS satisfy server, client and device enrollment needs? | PKI | CA/template/revocation decision |
| D-08 | What backup platform and immutable/off-site target are approved? | Infrastructure | RPO/RTO and repository design |
| D-09 | Which ticketing/case platform should own approvals and escalations? | Service Owner | Integration/ownership decision |
| D-10 | What endpoint data is approved for collection and retention? | Privacy/HR | Signed data dictionary |
| D-11 | Where will PostgreSQL, identity, queue, object storage and workers run? | Infrastructure | Pilot and production topology |
| D-12 | Which 10-20 endpoints represent the production fleet safely? | Business + Endpoint | Pilot list and rollback owner |

## Prioritized engineering backlog

### P0 - before platform feature work

- RB-001: Approve ADR-001 and system-of-record boundaries.
- RB-002: Create the production topology and dependency inventory.
- RB-003: Establish test strategy and add `test`, `test:integration`, and
  contract-test CI jobs.
- RB-004: Add request IDs and structured security audit to the current portal.
- RB-005: Replace ordinary JSON persistence for SMTP/AI secrets.
- RB-006: Threat-model identity, enrollment, Wazuh integration, automation
  jobs, and evidence storage.
- RB-007: Prove backup and restore of the current production configuration.

### P1 - platform foundation

- RB-101: Scaffold backend modules and `/api/v1` OpenAPI contract.
- RB-102: Add PostgreSQL migrations for users/role references, assets, devices,
  identities, findings, integration cursors, jobs, and audit events.
- RB-103: Deploy OIDC proof and map five target roles.
- RB-104: Implement central authorization policy and negative role tests.
- RB-105: Implement append-only audit and export.
- RB-106: Implement queue, retry, dead-letter, and idempotency conventions.
- RB-107: Add health/readiness/metrics and dependency dashboards.

### P2 - Device Center vertical slice

- RB-201: Wazuh agent synchronization.
- RB-202: AD computer/group synchronization.
- RB-203: Device identity normalization and reconciliation queue.
- RB-204: Asset lifecycle and assignment.
- RB-205: Device list/detail UI using only `/api/v1`.
- RB-206: Security-finding summary linked to devices.
- RB-207: Import preview, validation, and audit.

### P3 - enrollment and automation

- RB-301: Approve endpoint inventory data dictionary.
- RB-302: Implement CSR enrollment and approval.
- RB-303: Implement certificate renewal and revocation.
- RB-304: Build signed Go agent and package pipeline.
- RB-305: Create Ansible roles and pilot inventories.
- RB-306: Prove idempotence, rollback, resource use, and offline behavior.
- RB-307: Roll out 10%, 30%, then remainder with stop conditions.

### P4 - operational workflows

- RB-401: Vulnerability lifecycle, SLA and verification.
- RB-402: Exception and compensating-control workflow.
- RB-403: Incident case timeline and evidence hashes.
- RB-404: Manually approved isolation and recovery job.
- RB-405: Notification delivery jobs and escalation.
- RB-406: SLO, capacity, data-quality and compliance dashboards.
- RB-407: Service catalog, RACI, on-call and handover.

## Sprint 1: two-week execution plan

Sprint goal: remove architecture uncertainty and establish a safe engineering
baseline without changing production behavior.

### Deliverables

1. Review and approve or amend ADR-001.
2. Complete D-01 through D-06 with named owners.
3. Select the pilot endpoint cohort.
4. Write a current-state production diagram and data-flow diagram.
5. Create an application threat model.
6. Define backend repository/package structure and API conventions.
7. Define PostgreSQL migration, backup, and restore conventions.
8. Add a current-dashboard test runner and the first tests for:
   - JWT creation/validation.
   - Credentials and role decisions.
   - Wazuh response transformation.
   - Admin-only route authorization.
9. Record the current dashboard API inventory and disposition each route as
   retain, migrate, redesign, or remove.
10. Establish quality thresholds for new code: no new lint warnings, coverage
    on domain/security logic, contract tests, and successful production build.

### Sprint acceptance

- Decision owners are named; unknowns are not silently treated as facts.
- No production configuration or endpoint is changed.
- The current portal remains deployable.
- Test and threat-model outputs are reviewed by Security.
- The next sprint can scaffold identity/database/backend work without revisiting
  the main system boundaries.

## Decision gates

### Gate A: architecture

- ADR approved.
- Build/adopt/hybrid asset decision approved.
- System-of-record map approved.
- Hosting and support owners approved.

### Gate B: identity and data

- OIDC/AD proof passes enabled, disabled, removed-user, group-change and MFA
  scenarios.
- Privacy approves endpoint data.
- Database restore meets target RPO/RTO.

### Gate C: pilot

- No critical/high unresolved security finding.
- No incorrect device auto-merge.
- Wazuh parity is within agreed tolerance.
- Agent resource and network budgets pass.
- Rollback and certificate revocation pass.

### Gate D: production

- Runbooks, monitoring, on-call and escalation are active.
- Backup and disaster-recovery scenario has succeeded.
- Service owner accepts SLOs and residual risks.
- Pilot business owners sign acceptance.

## Key risks and controls

| Risk | Impact | Control |
|---|---|---|
| SOP assumptions differ from deployed infrastructure | Wrong architecture or outage | Phase 0 inventory and signed decision records |
| Device duplicates or bad merges | Incorrect actions and audit | Multi-signal identity and manual reconciliation |
| AD/OIDC misconfiguration | Lockout or over-privilege | Pilot groups, break-glass, negative authorization tests |
| Custom scope recreates Wazuh/Landscape/GLPI | Cost and fragility | Enforce system-of-record boundaries |
| Endpoint agent creates privacy concern | Adoption/compliance failure | Approved data dictionary and minimal collection |
| Automation runs too broadly | Fleet outage | Check mode, serial batches, approval, stop conditions |
| Certificate expiry/revocation failure | Loss of management or rogue device | Renewal monitoring and tested revocation/re-enrollment |
| Untested backup | Irrecoverable service | Restore-based acceptance, not backup-job success |
| Parallel systems disagree | Analyst confusion | Reconciliation dashboards and defined source precedence |
| Insufficient staffing | Long-lived partial platform | Fund cross-functional owners before Phase 2 |

## Program metrics

- Managed endpoint coverage.
- Devices with verified identity and assigned owner.
- Duplicate/ambiguous reconciliation backlog.
- Wazuh and inventory last-seen freshness.
- Critical/high vulnerability SLA compliance.
- Mean time to acknowledge and contain.
- Authentication and authorization failure rates.
- Automation success, rollback, and partial-failure rates.
- Backup restore success and measured RPO/RTO.
- Configuration/compliance exception count and expiry.
- Portal/API availability, latency, queue depth and sync delay.
- Percentage of state-changing actions with complete audit records.
