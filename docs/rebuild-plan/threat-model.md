# Application Threat Model

Status: Initial STRIDE review  
Review owners: Security, Identity, Infrastructure, Endpoint Engineering

## Protected assets

- Human identities, roles, sessions, and privileged approvals.
- Wazuh and indexer service credentials.
- Endpoint identity, certificate, inventory, owner, and security posture.
- Asset lifecycle and vulnerability-remediation records.
- Automation jobs and endpoint containment authority.
- SMTP, AI, webhook, PKI, database, backup, and object-storage secrets.
- Audit events, incident evidence, reports, and chain-of-custody metadata.
- Service availability and correctness of dashboards used for SOC decisions.

## Trust boundaries

1. Browser to reverse proxy.
2. Reverse proxy to portal/API.
3. API to OIDC provider and AD federation.
4. API/workers to PostgreSQL, queue, and object storage.
5. Integration workers to Wazuh, Landscape, AD, Ansible, and monitoring.
6. Enrollment service to endpoint agent.
7. CI/CD to registry and production runtime.
8. Operators to VPN, bastion, host, and break-glass access.

## Principal threats and controls

| ID | Threat | STRIDE | Existing exposure | Required control | Verification |
|---|---|---|---|---|---|
| TM-01 | Stolen or shared portal credential | S/E | Two shared environment-defined users | OIDC, named users, MFA, short sessions, access review | Disabled-user and MFA tests |
| TM-02 | Role bypass by calling API directly | E | Route-prefix authorization only | Central API policy and default deny | Negative tests for every role/action |
| TM-03 | Session forgery/replay | S | HMAC token in secure cookie | OIDC validation, rotation, issuer/audience checks, logout/revocation policy | Invalid issuer/audience/expiry tests |
| TM-04 | CSRF on state-changing routes | S/T | SameSite cookie reduces but does not fully model all clients | CSRF/origin enforcement and no state-changing GET | Cross-origin tests |
| TM-05 | Login rate-limit bypass/restart reset | D | In-memory per-process counter | Edge and distributed application limits | Multi-instance and forwarded-header tests |
| TM-06 | Secret disclosure from settings volume | I | SMTP/AI secrets in JSON | Secrets manager/runtime references and file permissions | Secret scan and runtime inspection |
| TM-07 | SSRF through scan/inspection tools | S/I | Private-prefix allow rules and network tools | Parsed IP/CIDR policy, DNS-rebinding defense, egress limits | IPv4/IPv6/encoded/rebinding tests |
| TM-08 | Unauthorized Wazuh agent restart | E/T/D | Admin route can invoke restart | Specific permission, validation, audit, rate/impact control | Analyst denial and audit test |
| TM-09 | Malicious external API response | T/D | Broad `any` transformations | Runtime schemas, size limits, timeouts, contract fixtures | Malformed/oversized response tests |
| TM-10 | Integration retry storm | D | Recursive Wazuh 429 retry can repeat | Bounded retries, backoff, circuit breaker and queue | Persistent 429 test |
| TM-11 | AI data exfiltration or prompt injection | I/T | Selected logs sent to configured Gemini API | Opt-in policy, redaction, size/classification rules, no tool authority | Sensitive-field and injection tests |
| TM-12 | Notification abuse/data leakage | I/D | Portal can send email/webhook notifications | Allowlisted destinations, templates, queue limits and audit | Unauthorized destination test |
| TM-13 | Device impersonation | S | Wazuh enrollment alone is not Device Center identity | CSR, local private key, mTLS, stable UUID, approved inventory | Clone/replay/expired certificate tests |
| TM-14 | Incorrect device merge | T | Hostname/IP can appear authoritative in UI | Multi-signal matching and manual ambiguity queue | Duplicate identity fixture suite |
| TM-15 | Compromised endpoint sends false inventory | T | New agent trust not yet implemented | mTLS identity, schema validation, plausibility and server timestamps | Forged UUID and impossible-value tests |
| TM-16 | Over-broad automation damages fleet | E/T/D | Shell deployment and future remote jobs | Approved bounded templates, pilot/serial, timeout, stop/rollback | Batch failure and authorization tests |
| TM-17 | Automatic isolation disrupts business | D | Future SOP requirement | Manual approval first, asset criticality and recovery job | Tabletop and pilot containment |
| TM-18 | Audit tampering or missing attribution | R/T | Console logs and subsystem logs are fragmented | Append-only audit, request/job IDs, restricted export | Tamper/access and completeness tests |
| TM-19 | Evidence altered after collection | T/R | No application evidence service | Hash, immutable object version, custody events and restricted access | Hash and access-review test |
| TM-20 | Database loss/ransomware | T/D | No current application database/restore | Encrypted 3-2-1-1-0 backup and restore drills | Scenario restore and measured RPO/RTO |
| TM-21 | Dependency or image compromise | T/E | SBOM/provenance exists for dashboard | Pinning, scans, signatures, protected build and release approval | CI policy and signature verification |
| TM-22 | Production runner compromise | E/T | Self-hosted runner can operate Docker | Dedicated account/host, scoped tokens, patching and audit | Runner hardening review |
| TM-23 | Certificate expiry/revocation failure | S/D | Wazuh CA bundle is manually mounted | Expiry alerts, renewal automation, tested revocation/re-enrollment | Expiry and CA outage exercise |
| TM-24 | Security dashboard presents stale data | T/R | Short cache and multiple fallback data sources | Visible freshness/source, sync SLO, last-success/error state | Dependency outage and stale-data test |

## Security invariants

- No endpoint action is authorized from browser state alone.
- A user cannot approve their own privileged-access grant or exception.
- A disabled identity cannot retain a portal session beyond the approved
  revocation window.
- An external identifier is always namespaced by its source.
- Hostname, IP, and MAC address are never sufficient alone for destructive
  action.
- A failed integration never silently converts to healthy or empty data.
- Every privileged action is linked to one actor, one request, one target set,
  one result, and one rollback/runbook.
- Secrets and private keys never appear in application audit payloads.
- Backup success is not accepted without a restore result.

## Required security reviews

1. Identity/OIDC and role model.
2. Endpoint enrollment, PKI and revocation.
3. Network-tool and automation egress.
4. Endpoint data dictionary and privacy.
5. Evidence and retention design.
6. CI/CD, registry and self-hosted runner.
7. Production threat-model delta before each major gate.
