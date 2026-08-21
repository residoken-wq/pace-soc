# Current-State Topology and Data Flows

Status: Repository-verified draft  
Infrastructure owner validation: Required

This document records only what can be established from the repository. IP
addresses, deployed versions, network routes, and service placement must be
validated against production before they are treated as authoritative.

## Repository topology

```text
Internet / administrator browser
                 |
                 | HTTPS 443
                 v
             Caddy 2.10
                 |
                 | HTTP 3000 on frontend network
                 v
        Next.js SOC dashboard
          |       |        |
          |       |        +--> SMTP / notification destinations
          |       +-----------> Gemini API when explicitly configured
          |
          +-------------------> Wazuh Manager API / TCP 55000 / TLS
          +-------------------> Wazuh Indexer / TCP 9200 / TLS

Managed Linux/Windows endpoint
          |
          +--> Wazuh Manager / TCP 1514
          +--> Wazuh enrollment / TCP 1515

Optional Linux monitoring deployment
          |
          +--> Promtail --> configured log receiver
          +--> Node Exporter --> metrics consumer
          +--> Wazuh agent --> Wazuh Manager
```

## Deployable repository components

| Area | Repository location | Observed purpose |
|---|---|---|
| Portal | `soc-agent/dashboard` | Next.js UI and 31 server route files |
| Agent stack | `soc-agent/docker-compose.yml` | Promtail, Node Exporter, Wazuh agent, dashboard |
| Client deployment | `soc-client` | Linux and Windows Wazuh installation |
| Detection tests | `soc-agent/tests` | Security-event simulations |
| Wazuh customization | `soc-agent/wazuh*` | Rules, decoder, metrics and retention helpers |
| Production edge | `deploy` | Dashboard image, Caddy, TLS and persistent volume |
| Delivery | `.github/workflows` | Lint/build, image publication, on-prem deployment |

## Human authentication flow

```text
Browser -> POST /api/auth/login
        -> compare username/password with environment-defined users
        -> create application HMAC token
        -> set HttpOnly `soc_auth` cookie
        -> proxy validates cookie on protected requests
        -> proxy permits admin-only route groups by application role
```

Current roles are `admin` and `analyst`. The application does not currently
federate with AD and does not have a durable user/access-review database.

## Wazuh read flow

```text
Portal route handler
  -> obtain/cache Wazuh API bearer token using service credentials
  -> query manager or indexer
  -> transform external response into page-specific payload
  -> return JSON to browser
```

Wazuh is the actual source of agent, alert, vulnerability, syscollector, and
security-log data. Transformations are currently coupled to individual route
handlers and are not protected by contract tests.

## State-changing flows

Observed state-changing operations include:

- Dashboard login/logout.
- Local settings JSON updates.
- Agent restart requests through the Wazuh API.
- Rule/configuration updates exposed through dashboard routes.
- Notification and test-email submission.
- Diagnostic and security-tool requests.

There is no general application audit-event store covering actor, object,
before/after values, request ID, approval, result, and correlation with an
external job.

## Persistence

The production dashboard mounts a single application data volume at
`/app/data`. Settings are persisted in `data/settings.json`. Wazuh and its
indexer are external to the production compose file. No repository-managed
PostgreSQL, queue, object store, identity provider, or secrets manager exists.

## Deployment flow

```text
Pull request / main push
  -> npm ci
  -> ESLint
  -> Next.js production build
  -> immutable dashboard image tagged by Git SHA
  -> publish to GHCR with SBOM and provenance
  -> self-hosted production runner
  -> Docker Compose deployment
  -> HTTPS health check
  -> restore previous image on failed deployment
```

This flow is reusable. It validates application startup but does not currently
run unit, integration, API-contract, migration, restore, or end-to-end tests.

## Production facts requiring validation

| ID | Repository assumption | Required validation |
|---|---|---|
| CV-01 | Public portal is `soc.pace.edu.vn` | DNS, certificate, edge and actual route |
| CV-02 | Wazuh Manager is reachable on 55000 | Hostname, certificate SAN, version, service account |
| CV-03 | Wazuh Indexer is reachable on 9200 | Topology, least-privilege account and retention |
| CV-04 | Agent enrollment uses 1515 and events use 1514 | Firewall, protocol and enrollment controls |
| CV-05 | AD domain is `pace.edu.vn` | Forest/domain health, OU, group and policy design |
| CV-06 | DC/DNS is at the SOP-recorded address | Redundancy and current addressing |
| CV-07 | Approximately 150 endpoints are in scope | Authoritative asset export by OS/location/owner |
| CV-08 | Caddy is the production edge | Confirm no additional proxy/WAF/load balancer |
| CV-09 | Dashboard volume is backed up | Backup schedule, encryption, retention and restore test |
| CV-10 | Current CI runner is production-authorized | Runner ownership, patching, credentials and audit |

## Current-state acceptance

Infrastructure, SOC, Identity, and Endpoint Engineering must review this
document. Each validation item must link to evidence, record an owner and date,
and replace assumptions with actual values in a controlled environment record.
