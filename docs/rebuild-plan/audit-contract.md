# Security Audit Contract

Status: Implemented as a transitional console sink

## Purpose

All security-relevant state changes must produce an attributable event that can
be correlated across the reverse proxy, portal, future API, background jobs,
and external systems.

The current dashboard now establishes this contract for the privileged Wazuh
agent restart path. The initial sink is structured application logging. The
future backend will persist the same logical event in an append-only audit
store and export it to centralized logging.

## Event fields

| Field | Required | Description |
|---|---:|---|
| `schemaVersion` | Yes | Audit schema version |
| `timestamp` | Yes | UTC event creation time |
| `requestId` | Yes | Valid UUID propagated through the request |
| `actor.username` | Yes | Authenticated username or `unknown` |
| `actor.role` | Yes | Authenticated role or `unknown`/`system` |
| `action` | Yes | Stable namespaced action |
| `target.type` | Yes | Stable target category |
| `target.id` | No | External or application target identifier |
| `outcome` | Yes | `success`, `failure`, or `denied` |
| `sourceIp` | No | Trusted client IP when available |
| `metadata` | No | Bounded non-secret diagnostic context |

## Invariants

- Request IDs are accepted only when they are syntactically valid UUIDs;
  arbitrary client strings are replaced.
- Authentication headers are supplied by the trusted application proxy and are
  never accepted as authorization proof when the proxy is bypassed.
- Passwords, tokens, cookies, authorization values, API keys, private keys, and
  similarly named nested fields are redacted before logging.
- Audit failure must not convert a failed privileged operation into success.
- User-facing error bodies do not serve as the audit record.
- Action names and target types are stable contract values, not display text.

## Current action catalog

| Action | Target | Outcomes |
|---|---|---|
| `wazuh.agent.restart` | `wazuh-agent` | success, failure, denied |

## Migration to the application core

The `/api/v1` backend must:

1. Persist audit events in an append-only table.
2. Prevent ordinary application roles from updating or deleting audit rows.
3. Link asynchronous job events to the originating request and approval.
4. Add before/after state for application-owned mutable records.
5. Export events to centralized logging without exposing secrets.
6. Define retention, access review, integrity checks, backup, and restore.
7. Monitor missing audit events and sink failures.
