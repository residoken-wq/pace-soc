# Wazuh Device Synchronization Contract

Status: Response validation and pure reconciliation planner implemented

## Purpose

Wazuh remains the system of record for Wazuh agents and security telemetry.
PACE Device Center consumes agent state and links it to application-owned
device records without treating hostname, IP, or MAC address as a safe unique
identity.

The first implementation validates bounded Wazuh response pages and feeds a
deterministic, side-effect-free planner. A future worker will fetch Wazuh
pages, load relevant Device Center identities, execute this planner, and
persist the resulting actions transactionally.

## Identity precedence

1. Existing namespaced Wazuh identity:
   `(source=wazuh, environment, type=agent_id, normalized_value)`.
2. One unambiguous system UUID match.
3. One unambiguous valid serial match.
4. Hostname match: manual reconciliation only.
5. No match: create a pending/new device candidate.

IP address is telemetry and is never an automatic merge key. Placeholder
serials are discarded. The Wazuh manager pseudo-agent `000` is excluded from
endpoint inventory.

## Planner actions

| Action | Meaning | Future persistence behavior |
|---|---|---|
| `skip` | Manager pseudo-agent or explicitly excluded source object | Record sync metric only |
| `update` | Existing Wazuh external identity found | Refresh permitted Wazuh-derived fields |
| `link` | Exactly one high-confidence device match | Add external identity and refresh fields |
| `review` | Hostname-only or conflicting high-confidence matches | Create reconciliation work item |
| `create` | No identity or candidate match | Create new device with Wazuh identity |

## Safety invariants

- External identity is always namespaced by source and environment.
- Duplicate Wazuh agent IDs in one sync page fail the page rather than silently
  overwrite data.
- A hostname-only match never produces an automatic link.
- Conflicting system UUID and serial matches never produce an automatic link.
- Retired/quarantined lifecycle behavior will be policy-controlled before the
  worker is allowed to mutate those records.
- Sync input is normalized before matching and persistence.
- Planner output is deterministic for the same input and device snapshot.

## Worker requirements

The future durable worker must:

1. Use a least-privilege read-only Wazuh service account.
2. Fetch with bounded pagination, timeout, retry, and rate-limit handling.
3. Validate external response schemas before invoking the planner. Implemented
   for bounded agent pages; transport-level envelope and HTTP policy remain in
   the future adapter.
4. Lock or version affected device records during persistence.
5. Store its cursor only after the database transaction succeeds.
6. Use an idempotency key derived from integration, environment, stream, and
   source cursor/page.
7. Write audit events for links, review decisions, and lifecycle-sensitive
   changes.
8. Expose last attempt, last success, lag, failure count, and stale state.
9. Never delete a Device Center device because a Wazuh agent disappeared.
10. Stop and alert on abnormal deletion/disconnection volume.
