# PACE-UEM Application API

This directory contains the framework-neutral API contract for the new
application core.

The runtime framework is intentionally not scaffolded until ADR-001 Gate A is
approved. The OpenAPI contract, database schema, security boundaries, and test
fixtures are designed to survive that decision.

## Initial modules

- Platform health and readiness.
- Device search and detail.
- Immutable audit-event query.
- Standard problem responses and request correlation.

The first runtime implementation must:

- Serve the contract in `openapi.yaml`.
- Validate requests and responses at runtime.
- Enforce OIDC roles at the API.
- Use the caller-provided/proxy-generated `x-request-id`.
- Persist state changes and audit events in one database transaction where
  application state is owned locally.
- Keep Wazuh synchronization behind an adapter and durable integration cursor.

No production endpoint is currently connected to this scaffold.
