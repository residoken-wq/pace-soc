# Sprint 1 Status

Status date: 2026-07-25

## Completed from repository evidence

- [x] Target architecture ADR drafted.
- [x] Current repository topology and data flows documented.
- [x] Initial application threat model documented.
- [x] All 31 current API route files classified.
- [x] Backend module and API conventions proposed.
- [x] PostgreSQL migration and recovery conventions proposed.
- [x] Dashboard test runner added without a new third-party dependency.
- [x] Token configuration, validation and tamper tests added.
- [x] Admin/analyst route-policy tests added.
- [x] Wazuh agent transformation tests added.
- [x] Tests added to both CI and production-release validation.
- [x] Wazuh transformation extracted from the route handler.
- [x] Access policy extracted from the framework proxy for direct testing.
- [x] Request IDs validated, generated, propagated, and returned to clients.
- [x] Structured security-audit contract implemented with recursive redaction.
- [x] Wazuh agent restart success, denial, and failure outcomes audited.
- [x] `/api/v1` OpenAPI foundation and bounded collection contracts added.
- [x] Transactional PostgreSQL core and reconciliation migrations added.
- [x] Append-only audit storage enforced by database triggers and verification SQL.
- [x] OIDC claims-context validation and explicit AD-group role mapping added.
- [x] Deterministic Wazuh synchronization and durable run-control models added.
- [x] Bounded Wazuh agent-page response validation added.
- [x] Validated Wazuh response-to-sync-batch boundary added.
- [x] Bounded Wazuh transport retry and failure-classification policy added.
- [x] Stable Wazuh pagination and cursor-advancement guards added.

## Validation

| Check | Result |
|---|---|
| `npm test` | Passed: 5 test files |
| `npm run lint` | Passed with 0 errors and 264 pre-existing warnings |
| `git diff --check` | Passed |
| `npx tsc --noEmit` | Passed |
| Production build | Previously blocked by sandbox port restriction; CI remains authoritative |

## Waiting for owner evidence

- [ ] D-01 production service/version/address/certificate inventory.
- [ ] D-02 authoritative endpoint inventory by OS, owner and criticality.
- [ ] D-03 AD OU/group/service-account/policy inventory.
- [ ] D-04 approved identity-provider decision.
- [ ] D-05 GLPI/CMDB build-versus-adopt decision.
- [ ] D-06 Landscape license and deployment decision.
- [ ] Pilot list of 10-20 representative endpoints.
- [ ] Architecture ADR approval by the decision owners.
- [ ] Security review of the threat model.
- [ ] Infrastructure review of database and recovery conventions.

## Foundation progress beyond the original Sprint 1 scope

1. [x] Scaffold `/api/v1` foundation and OpenAPI contract.
2. [x] Add PostgreSQL pilot service and initial migrations.
3. [x] Add append-only audit storage and transitional request-ID handling.
4. [x] Implement framework-neutral OIDC validation with the five target roles.
5. [x] Implement read-only Wazuh normalization, response validation, and
   synchronization planning.

## Next implementation step

After Gate A/B approvals, select and scaffold the runtime backend, then connect
the existing identity, audit, database, and Wazuh domain contracts through
runtime request/response validation and transactional persistence. Before
approval, only framework-neutral contracts, tests, and adapters may proceed.

No production deployment or endpoint rollout is authorized by this status
document.
