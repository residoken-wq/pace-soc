# OIDC Identity and Authorization Contract

Status: Claims-context validation and explicit role mapping implemented

## Trust boundary

The application-domain module does not parse or verify JWT signatures. A
production OIDC adapter must first verify the token cryptographically using the
approved issuer's discovery metadata and keys. Only verified claims may enter
the application mapping module.

The adapter and mapping module together must enforce:

- Approved signing algorithms.
- Signature and key validity.
- Exact issuer.
- Intended API audience.
- Expiration, issued-at, and not-before times.
- Stable subject.
- Required username claim.
- Correctly typed group claims.

## Role source

Application roles derive only from an explicit configured mapping of trusted AD
groups:

| AD group | Application role |
|---|---|
| UEM administrators | `uem_admin` |
| Asset managers | `asset_manager` |
| IT support | `support` |
| Security analysts | `security_viewer` |
| Auditors | `auditor` |

Exact production group distinguished names remain a Gate B configuration item.
Mapping comparisons are case-insensitive, but ambiguous mappings differing only
by case are rejected.

Arbitrary token claims named `roles`, client roles, realm roles, or groups not
in the mapping do not grant application access.

## Authorization rules

- Authentication without a mapped role does not grant API access.
- Every operation declares one or more required application roles.
- The API checks roles after cryptographic and claims-context validation.
- The frontend may hide controls for usability but is not an authorization
  boundary.
- State-changing operations still require their domain checks, version,
  idempotency, and audit in addition to role authorization.

## Production OIDC adapter requirements

1. Use a maintained OIDC/JWT library; do not implement signature verification
   in application code.
2. Load discovery only from the configured HTTPS issuer.
3. Cache keys within issuer-provided rules and refresh safely on key rotation.
4. Reject `none`, algorithm confusion, unknown key, invalid signature, issuer,
   audience, time, and malformed-claim cases.
5. Define session and token lifetimes with Identity/Security.
6. Test disabled user, removed group, password reset, logout, IdP outage, key
   rotation, clock skew, and break-glass scenarios.
7. Do not persist access or refresh tokens in normal application tables or
   logs.
8. Record subject, username, mapped roles, issuer, request ID, and decision
   outcome in appropriate audit events without recording the token.
