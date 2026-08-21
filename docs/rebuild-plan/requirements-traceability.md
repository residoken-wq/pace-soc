# Requirements Traceability and Gap Matrix

Status values:

- **Reuse**: current implementation is a useful foundation.
- **Extend**: capability exists but does not meet the SOP outcome.
- **Build/Adopt**: no sufficient current implementation.
- **Decision**: infrastructure or product choice must be verified first.

| SOP | Required outcome | Current evidence | Disposition | Target owner | Acceptance evidence |
|---|---|---|---|---|---|
| 001 | Approved AD/UEM architecture, namespace, network and decision gates | Static manager/DC addresses and Wazuh topology appear in scripts/docs | Extend | Architecture + AD | Signed topology, data flows, firewall matrix, go/no-go record |
| 002 | Healthy AD/DNS/NTP, Ubuntu OUs/groups and delegated join | Client scripts assume domain services; no repository-owned AD validation | Build/Adopt | AD team | `dcdiag`, replication, DNS SRV, time, OU/group and delegation evidence |
| 003 | Hardened Ubuntu management server with backup and acceptance | Production deployment guidance exists; host baseline is not codified | Extend | Infrastructure | Reproducible build, hardening scan, network test, backup/restore record |
| 004 | UMS joins AD with SSSD/Kerberos and least privilege | No controlled AD-join implementation in current application | Build/Adopt | AD + Linux | Pilot join, group login, sudo mapping, offline behavior, rollback |
| 005 | Versioned, idempotent Ansible control and pilot rollout | Shell installers exist; no Ansible repository or roles | Build/Adopt | Endpoint Engineering | Lint, check/diff, idempotence, pilot execution, Vault and audit evidence |
| 006 | Standard Ubuntu Desktop build and domain join | Linux Wazuh installers cover only monitoring deployment | Build/Adopt | Endpoint Engineering | Golden-build checklist, AD login, baseline agents, rollback |
| 007 | Controlled PXE/autoinstall zero-touch deployment | No PXE/NoCloud implementation | Build/Adopt | Endpoint Engineering + Network | LAB/PILOT install, unique identity, no embedded secrets, emergency stop |
| 008 | Landscape clients, patch rings, package/repository governance | Vulnerability UI exists; no Landscape integration | Decision | Endpoint Operations | Version/license decision, registered pilot, patch ring and rollback |
| 009 | Device Center with identity, asset lifecycle, API and audit | Wazuh agent/device views exist without CMDB or application database | Build/Adopt | Product + Engineering | PostgreSQL model, OIDC/RBAC, reconciliation, lifecycle, audit export |
| 010 | Wazuh XDR, health metrics and Suricata NDR correlation | Strong Wazuh/API foundation; Node Exporter/Promtail deployment exists | Extend | SOC + Observability | Compatibility matrix, Wazuh groups, alerts, metrics SLO, Suricata pilot |
| 011 | Central protected logging, audit evidence and retention | Wazuh/Indexer logs and retention helper exist; app audit is incomplete | Extend | SOC + Compliance | TLS forwarding, audit rules, application audit, retention and retrieval test |
| 012 | 3-2-1-1-0 backup, RPO/RTO and tested recovery | Deployment rollback and named volumes exist; no full restore evidence | Build/Adopt | Infrastructure | Backup inventory, encrypted repositories, scenario restores, DR record |
| 013 | Approved Ubuntu security baseline and compliance exceptions | Wazuh custom rules exist; no controlled CIS baseline rollout | Build/Adopt | Security + Endpoint | Profile, pre/post scan, exceptions, staged Ansible deployment, rollback |
| 014 | Signed internal APT, immutable snapshots and promotion rings | Installers download from Internet/GitHub; no internal package supply chain | Build/Adopt | Platform + Security | Signed `.deb`, Aptly snapshots, DEV/PILOT/PROD promotion and rollback |
| 015 | Internal PKI, TLS/mTLS, SSH certificates and secrets governance | Caddy TLS and Wazuh CA bundle are reusable; no enrollment PKI | Decision | PKI + Security | AD CS decision, CA design, issuance, renewal, revocation, recovery test |
| 016 | Identity lifecycle, RBAC, privileged access and evidence | Only `admin` and `analyst` environment users exist | Build/Adopt | Identity + Security | OIDC, AD groups, JML test, break-glass, access review and audit |
| 017 | Segmented management access through VPN/bastion/802.1X | App networks are partially segmented; endpoint management path unverified | Decision | Network Security | VLAN/firewall matrix, bastion flow, access revocation and logged pilot |
| 018 | Finding ownership, risk priority, SLA, remediation and verification | Wazuh CVE display exists; no durable workflow/owner/due date | Extend | Security + Endpoint Ops | Finding lifecycle, SLA timers, exception approval, rescan closure |
| 019 | Incident cases, guarded isolation, evidence and recovery | Alerting and test scripts exist; no case/evidence/containment workflow | Extend | SOC/IR | Case timeline, approval, isolation pilot, hashes/chain of custody, recovery |
| 020 | Service catalog, SLO/SLA, RACI, runbooks and handover | CI/deploy/runbook fragments exist; service governance is incomplete | Build/Adopt | Service Owner | Signed RACI, SLO dashboard, on-call, restore drill, training and acceptance |

## Cross-cutting product requirements

| ID | Requirement | Priority | Verification |
|---|---|---:|---|
| IAM-01 | Human authentication uses approved OIDC federation | Must | Integration test with enabled, disabled, and removed AD users |
| IAM-02 | Authorization is enforced by the API, not only hidden in the UI | Must | Negative API tests for every role and state-changing endpoint |
| AUD-01 | State changes create immutable, attributable audit events | Must | Before/after/request-ID test and tamper/access review |
| DAT-01 | PostgreSQL migrations are versioned and recoverable | Must | Empty install, upgrade, rollback strategy, backup restore |
| DEV-01 | Devices have stable UUID/certificate identity | Must | Reboot, rename, NIC change, and reimage tests |
| DEV-02 | Ambiguous devices enter a reconciliation queue | Must | Duplicate serial/hostname/MAC test set |
| INT-01 | External adapters are idempotent and retry safely | Must | Replay, timeout, partial failure, and rate-limit tests |
| API-01 | Public application APIs are versioned and documented | Must | OpenAPI validation and backward-compatibility check |
| SEC-01 | Secrets are not committed or stored in ordinary settings | Must | Secret scan, deployment inspection, rotation test |
| SEC-02 | Privileged jobs are bounded, authorized, audited, and timed out | Must | Unauthorized and failure-path job tests |
| OPS-01 | Each service exposes health, readiness, metrics, and structured logs | Must | Monitoring and simulated dependency-failure test |
| BCP-01 | RPO/RTO are approved and scenario restores are tested | Must | Signed restore evidence |
| PRIV-01 | Endpoint collection follows an approved data dictionary | Must | Privacy/HR review and payload conformance test |
| REL-01 | Releases are immutable and have a tested rollback | Must | Image digest/SBOM and rollback exercise |
| TST-01 | Unit, integration, contract, migration, and smoke tests run in CI | Must | Protected CI status checks |

## Current-system disposition

### Retain and harden

- Wazuh authentication and API adapters.
- Alert, vulnerability, agent, MITRE, and visualization components.
- Custom Wazuh rule mappings and event simulation tests.
- Linux and Windows deployment knowledge.
- Caddy HTTPS and CA-bundle handling.
- Immutable-image CI/CD and production rollback.

### Migrate

- Authentication to OIDC.
- Dashboard data access to the backend API.
- Settings to validated database configuration and secret references.
- Notification execution to durable background jobs.
- Device views to reconciled Device Center identities.
- Vulnerability views to durable remediation workflows.

### Remove or redesign

- Environment-defined human user database.
- Direct plaintext credential comparison.
- JSON-file secret persistence.
- Simulated health/fix behavior presented as an operational control.
- Unbounded or insufficiently governed network tools.
- Duplicate source-of-truth logic for Wazuh, Landscape, AD, or Ansible.
