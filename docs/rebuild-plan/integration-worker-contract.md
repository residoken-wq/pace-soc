# Integration Worker Control Contract

Status: State machine and validated Wazuh batch envelope implemented

## Purpose

Integration retries must not duplicate device links, reconciliation items, or
audit events. Worker execution is represented by a durable integration run
whose identity is stable for one source page/cursor.

## Idempotency

The idempotency key is SHA-256 over:

```text
normalized integration
NUL
normalized environment
NUL
normalized stream
NUL
exact source cursor
```

Reprocessing the same cursor produces the same key. A different cursor produces
a different key. The database uniquely constrains the key within integration,
environment, and stream.

## State model

```text
pending -> running -> succeeded
                    -> failed -> running
                    -> dead_letter
```

- Starting increments `attemptCount`.
- Only pending and retryable failed runs may start.
- Success requires applied plus review counts to equal the planned count.
- Failure clears partial result counts because persistence must be
  transactional.
- The final failed attempt becomes `dead_letter`.
- Succeeded, running, and dead-letter runs cannot be started again.

## Wazuh batch envelope

The batch contains:

- Stable integration run and idempotency key.
- Exact source cursor.
- Validated source total for pagination and lag telemetry.
- Deterministic planner output.
- Actionable planned count.
- Explicit skipped count.

Wazuh manager agent `000` remains visible as a skipped plan but is excluded
from the actionable count.

The external response must pass the bounded agent-page validator before the
batch builder creates an integration run. Invalid source objects therefore
cannot produce a persisted run identity or reconciliation plan.

## Pagination control

Agent pages use bounded offset/limit cursors serialized as
`offset:<offset>:limit:<limit>`. Advancement uses the actual returned count,
not the requested limit. The controller rejects oversized pages, offsets or
contents beyond the advertised source total, and empty pages before completion
so a worker cannot enter a zero-progress loop. The serialized cursor is the
source cursor used by the next idempotent integration run.

## Runtime transaction requirement

For one source page, the worker must commit atomically:

1. Device updates, identity links, new candidates, and reconciliation items.
2. Audit events for relevant state changes.
3. Integration-run success and counts.
4. Integration cursor advancement.

If any operation fails, none of these changes or cursor advancement may commit.
External retry uses the same idempotency key and must receive the previously
stored result or safely resume the failed run.

## Operational controls

- Bounded pages and payload sizes.
- Timeouts and exponential backoff with jitter. A framework-neutral policy now
  classifies timeout, network, rate-limit, and HTTP failures; caps retries at
  ten attempts and delays at the configured maximum; and stops immediately on
  authentication and other terminal client failures.
- Error codes without credentials or raw sensitive payloads.
- Dead-letter alert with run ID and request/correlation ID.
- Stop threshold for abnormal create, disconnect, or review volume.
- Metrics for lag, duration, attempts, planned/applied/review/skipped counts,
  failures, and dead letters.
