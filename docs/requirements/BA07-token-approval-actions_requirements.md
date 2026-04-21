# BA07 Token Approval Actions

## Slice metadata

- Status: Planned
- Depends on: BA04, BA05a
- Backend impact: Write contract change required
- Frontend impact: Both
- Safe for unattended execution: No
- Ownership notes:
  - Backend: Owns token resolution, expiry/replay protection, and approval action mutation contracts.
  - Frontend: pace-portal owns `/approvals/:token` UI; BASE owns contract authority only.

## Filename convention

Feature requirement slices use numbered BASE prefixes (`BA##`) and a scope slug:

**`BA07-token-approval-actions_requirements.md`**

## Overview

This slice owns the **backend contracts** and **acceptance criteria** for guardian/referee token approval. **UI** is **[PR20 — Token approval host](../../portal/PR20-token-approval-host.md)** on pace-portal at **`/approvals/:token`** only. **No** BASE-origin approval route in this rebuild wave.

- Primary route (portal): `/approvals/:token` (see PR20)
- Route ownership must match the implementation plan in [`./BA00-base-architecture.md`](./BA00-base-architecture.md)

## Current baseline behavior

The legacy app does not provide a trustworthy token-approval surface.

- There is no legacy UI that can be treated as authoritative for token lifecycle, expiry, or replay handling
- The legacy codebase should be read only as observational background
- Any approval-page assumptions must come from the rebuild docs and backend contract, not the legacy app

## Rebuild delta

### Summary

- What changes: Defines standalone token-based approval decision contracts with strict lifecycle and security rules.
- What stays: Token approval remains outside BASE shell and outside organiser queue coupling.

Provide a standalone approval page for time-bound approval requests.

- Resolve the token and show only the minimum request context required for a guardian or referee to act while the token is still valid
- Allow the backend action to record a decision-maker response of `approve` or `reject`
- Require comments for `reject`
- Allow optional comments for `approve`
- Reject invalid, expired, reused, or already-resolved tokens explicitly
- Keep the page outside the BASE admin shell
- Keep token handling and approval state changes backend-owned and security-conscious
- Treat guardian and referee approval as BASE-owned token workflows even though other logged-in approval queues remain TEAM-owned

### pace-core2 delta

Token approval is a standalone workflow, not an authenticated admin shell page.

- Do not use `PaceAppLayout` for this route unless the architecture doc is explicitly changed later
- Use scoped `@solvera/pace-core` primitives for form, state, resilience, and API boundaries only
- Prefer secure service and error-handling patterns over ad hoc client logic
- Treat token lifecycle as a backend contract, not a UI assumption

### pace-core2 imports

Use these `pace-core2` import families when implementing the slice:

- `@solvera/pace-core/components`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/resilience`
- `@solvera/pace-core/services`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`

If the implementation needs permission-aware calls, include `@solvera/pace-core/rbac` and `@solvera/pace-core/providers` only as required by the resolved backend contract.

### Data and schema references

- `base_application_check`
- `base_registration_type_requirement`
- `base_registration_type`
- `base_application`
- `base_application_check.token_hash`
- `base_application_check.token_expires_at`

**Database (DB-303)** — `app_base_application_check_submit` enforces **non-empty trimmed notes** when the outcome is **`reject`** (optional notes when **`approve`**). Align portal validation with this RPC contract.

The rebuild contract for approval-request tokens is:

- token values are opaque secrets and must not be stored in plain text
- backend persistence stores a hashed token only on `base_application_check`
- tokens are single-use
- tokens expire `14 days` after issue
- regeneration or resend invalidates any previously active token for the same approval request immediately
- token lifecycle state is part of `base_application_check`; BASE must not invent a parallel token table or separate persistence contract
- `reject` requires notes; `approve` may include notes but does not require them

## Acceptance criteria

- A valid token loads the approval page and presents the correct request context
- A decision-maker can submit `approve` or `reject` through the approved backend action contract
- `reject` cannot be submitted without comments
- `approve` may include comments but does not require them
- Invalid, expired, reused, or already-resolved tokens are rejected explicitly
- The page does not inherit the BASE authenticated shell
- Security-sensitive token handling is documented rather than inferred from the legacy codebase

## API / Contract

- Token resolution contract
- Approval-request read contract
- Approval action contract with `decision`, `comments`, and audit metadata
- Token invalidation or replay contract
- Error-state contract for expired, revoked, reused, or already-resolved requests

Portal integration contract index for this slice:

- Route host: pace-portal `/approvals/:token` (PR20), with no BASE-origin fallback route.
- Required backend contracts: token resolve/read plus `app_base_application_check_submit` decision submission contract.
- Portal validation rule that must match backend: `reject` requires non-empty trimmed comments; `approve` comments remain optional.

## Visual specification

Not applicable to the BASE shell.

- This is a standalone token page with minimal chrome
- The page should focus on minimal request context, the required action, and clear success or failure feedback
- The layout must not resemble the authenticated admin shell or expose BASE navigation
- Expired, revoked, reused, or already-resolved tokens must show a generic terminal state without redisplaying potentially sensitive submitted details

## Verification

- Load a valid token and confirm the request context appears
- Resolve the request with `approve` and confirm the success state is shown
- Resolve the request with `reject` and confirm comments are required
- Load an invalid or expired token and confirm the generic terminal state appears
- Reload a reused or already-resolved token and confirm the page does not allow a duplicate action
- Regenerate a token, confirm the new token works, and confirm the previous token is no longer usable

## Testing requirements

- Happy path: valid token loads and an `approve` action succeeds
- Validation failure: malformed or expired token is rejected
- Validation failure: `reject` without comments is rejected
- Auth/permission failure: an unauthorized caller cannot resolve the approval request
- Add coverage for replay protection, already-resolved token states, and regenerated-token invalidation

## Acceptance traceability

- Valid token and decision criteria -> Token resolution + approval action contracts -> Approve/reject submission tests.
- Reject-comment and token lifecycle criteria -> DB-303 aligned validation + replay/expiry/reuse protection -> Validation and replay-protection tests.
- Shell isolation/security criteria -> Standalone portal route behavior + sensitive-state terminal handling -> Route isolation and sensitive-data handling tests.

## Manual QA pack requirements

- Scenarios: Execute verification flows for valid token approve/reject, invalid/expired/reused token behavior, and regenerated-token invalidation.
- Expected outcomes: Decision handling and terminal states follow backend contract and do not expose unnecessary detail.

## Build execution rules

- Backend schema, RPC, and RLS changes are allowed only when the exact delta is pre-listed in `docs/delivery/backend-delta-backlog.md` and linked from this slice before implementation.
- Stop on blockers: unresolved token RPC behavior, mismatched reject-notes validation, or unresolved token lifecycle security requirements.

## Done criteria

- Tests pass: Token resolution, decision submission, lifecycle/replay protection, and validation tests pass.
- QA passed: Manual QA evidence for verification scenarios is captured.
- Docs updated: BA07 remains aligned with portal route ownership and DB authority references.

## Do not

- Do not use the shared authenticated BASE shell for this route
- Do not invent a token persistence model that conflicts with `base_application_check.token_hash` and `token_expires_at`
- Do not silently accept expired or reused tokens
- Do not couple this flow to the organiser review queue
- Do not preserve legacy token-flow quirks unless they are explicitly re-approved

## References

- [`./BA00-base-project-brief.md`](./BA00-base-project-brief.md)
- [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- the shared shell contract in [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- the pace-core2 compliance rules in [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy decision archive)
- [`../../../database/domains/base.md`](../../../database/domains/base.md)
- [`../../../database/decisions/DB-change-decisions-p3.md`](../../../database/decisions/DB-change-decisions-p3.md) (**DB-303** token RPCs)
- the implementation plan in [`./BA00-base-architecture.md`](./BA00-base-architecture.md)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (demo app for pace-core, or in-app for consuming apps) as specified in "Testing requirements" and "Verification". Run validate and fix any issues until it passes.

---

**Checklist before running Cursor:** intro doc + guardrails doc + Cursor rules + ESLint config + this requirements doc.
