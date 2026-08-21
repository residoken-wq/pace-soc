# Current API Disposition

Disposition:

- **Retain**: useful endpoint; harden and eventually proxy through the new API.
- **Migrate**: move behavior and contract into a new backend module.
- **Redesign**: outcome remains useful but current security/behavior is not.
- **Remove**: development or duplicate route not suitable for production.

| Current route | Methods | Disposition | Target module | Notes |
|---|---|---|---|---|
| `/api/health` | GET | Retain | Platform health | Split liveness and readiness; report dependencies safely |
| `/api/auth/login` | POST | Redesign | Identity | Replace local password flow with OIDC |
| `/api/auth/logout` | GET, POST | Redesign | Identity | Remove state-changing GET; use OIDC logout/session policy |
| `/api/wazuh/agents` | GET, POST | Migrate | Wazuh adapter + devices | GET sync/read model; restart becomes an audited job |
| `/api/wazuh/alerts` | GET | Redesign | Findings/events | Current fallbacks combine manager logs, FIM and rootcheck as “alerts” |
| `/api/wazuh/syscollector` | GET | Migrate | Wazuh adapter | Schema validation and device linkage |
| `/api/wazuh/vulnerabilities` | GET | Migrate | Findings | Add durable owner, SLA, state and verification |
| `/api/wazuh/test` | GET, POST | Remove | Integration diagnostics | Replace with protected health/diagnostic job |
| `/api/alerts/stream` | GET | Migrate | Event stream | Authenticate stream, bound connections and expose freshness |
| `/api/logs` | GET | Migrate | Log adapter | Versioned query contract, pagination and safe filters |
| `/api/logs/sources` | GET | Migrate | Log adapter | Derive from registered integrations |
| `/api/logs/cleanup` | GET, POST | Remove | Retention policy | Current cleanup is not implemented; retention belongs to indexer policy |
| `/api/mitre/data` | GET | Migrate | Analytics | Server-side typed aggregation |
| `/api/mitre/stats` | GET | Migrate | Analytics | Server-side typed aggregation |
| `/api/metrics` | GET | Redesign | Observability | Use a configured metrics adapter; eliminate arbitrary host access |
| `/api/threats/traffic` | GET | Redesign | NDR adapter | Source from Suricata/approved telemetry |
| `/api/geoip` | GET | Retain | Enrichment | Cache/version dataset and define privacy/accuracy |
| `/api/rules` | GET, POST | Redesign | Detection content | Git/version/approval deployment instead of local mutable definitions |
| `/api/settings` | GET, POST | Redesign | Configuration | Database metadata plus secrets references and audit |
| `/api/notifications` | GET, POST | Migrate | Notification jobs | Durable queue, delivery state, templates and destination policy |
| `/api/notifications/email` | POST | Migrate | Notification jobs | Internal job only; do not expose unrestricted send |
| `/api/email/test` | POST | Redesign | Notification diagnostics | Audited admin test with destination restrictions |
| `/api/ai/analyze` | POST | Redesign | Analysis job | Opt-in, redaction, prompt defense, budget and audit |
| `/api/network` | POST | Redesign | Diagnostics | Bounded targets, egress policy and job audit |
| `/api/tools/inspector` | POST | Redesign | Diagnostics | Replace arbitrary inspection with approved templates |
| `/api/tools/portscan` | GET | Redesign | Diagnostics | POST job, approved targets, rate limit and authorization |
| `/api/tools/web-analyze` | POST | Redesign | Diagnostics | URL parsing, DNS-rebinding defense and egress proxy |
| `/api/system/fix` | POST | Remove | Automation jobs | Current behavior is simulated/instructional |
| `/api/debug/indexer` | GET | Remove | Platform diagnostics | Never expose raw production debug route |
| `/api/debug/ssh-alerts` | GET | Remove | Test/diagnostics | Move to protected integration test tooling |
| `/api/debug/wazuh` | GET | Remove | Platform diagnostics | Never expose raw production debug route |

## Migration sequencing

1. Health/readiness and identity.
2. Wazuh agents and normalized device identities.
3. Vulnerabilities/findings and remediation lifecycle.
4. Alerts/events, logs, MITRE and analytics.
5. Settings, notifications and durable jobs.
6. Governed diagnostics and automation.
7. Remove debug, simulated and duplicate routes.

## Contract rules for `/api/v1`

- JSON request and response schemas are explicit and runtime-validated.
- Errors use a stable problem-details structure and never expose secrets.
- Collection endpoints support bounded pagination and deterministic sorting.
- State-changing requests accept an idempotency key where retry is possible.
- External IDs include source and tenant/environment namespace.
- Timestamps are UTC ISO 8601; server receipt and source event times are
  distinguishable.
- Authorization is declared and tested per operation.
- Every state change returns or exposes its audit/request ID.
- Long-running operations return a job resource rather than holding an HTTP
  request.
- Contract changes follow semantic API compatibility and deprecation policy.
