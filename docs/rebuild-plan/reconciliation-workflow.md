# Device Reconciliation Workflow

Status: Persistence, API contract, and decision state machine implemented

## Purpose

Ambiguous Wazuh/device matches must become owned review work. They must never be
silently merged or resolved through a client-side-only decision.

## Workflow

```text
Wazuh synchronization planner
        |
        | review outcome
        v
Pending reconciliation item
        |
        +--> link_existing --> resolved + approved identity link
        +--> create_new ----> resolved + new device
        +--> dismiss -------> dismissed + no device mutation
```

Only `uem_admin` and `asset_manager` may decide an item. Support and audit roles
may receive read access but cannot mutate it.

## Concurrency and retry controls

- Every item has an optimistic `version`.
- The decision supplies `expectedVersion`.
- Stale or already-decided requests receive a conflict.
- Decision requests require an idempotency key at the API.
- Only one pending item may exist for a source/environment/external identity.
- Integration runs have a unique idempotency key per integration stream.

## Decision controls

- `link_existing` requires selection from the reviewed candidate list.
- `create_new` cannot include a selected existing device.
- `dismiss` cannot include a selected device.
- All decisions require a meaningful justification.
- Successful decisions return a structured audit plan.
- Persistence must update the item, perform its effect, and insert the audit
  event within one transaction.

## Still required in the runtime implementation

- Repository transaction with row lock or version-checked update.
- Idempotency response persistence for decision retries.
- Authorization derived from validated OIDC claims.
- Candidate/device existence and lifecycle checks.
- Special approval for linking retired or quarantined devices.
- Before/after audit persistence.
- Metrics for queue age, volume, decision time, conflicts, and dismissals.
