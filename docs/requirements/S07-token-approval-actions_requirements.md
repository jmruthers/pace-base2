## Overview

This slice owns the **backend contracts** and **acceptance criteria** for guardian/referee token approval. **UI** is **[PR20 — Token approval host](../../portal/PR20-token-approval-host.md)** on pace-portal at **`/approvals/:token`** only. **No** BASE-origin approval route in this rebuild wave.

- Primary route (portal): `/approvals/:token` (see PR20)
- Route ownership must match the implementation plan in [`../architecture.md`](../architecture.md)

## Current legacy baseline

The legacy app does not provide a trustworthy token-approval surface.

- There is no legacy UI that can be treated as authoritative for token lifecycle, expiry, or replay handling
- The legacy codebase should be read only as observational background
- Any approval-page assumptions must come from the rebuild docs and backend contract, not the legacy app

## Rebuild target

Provide a standalone approval page for time-bound approval requests.

- Resolve the token and show only the minimum request context required for a guardian or referee to act while the token is still valid
- Allow the backend action to record a decision-maker response of `approve` or `reject`
- Require comments for `reject`
- Allow optional comments for `approve`
- Reject invalid, expired, reused, or already-resolved tokens explicitly
- Keep the page outside the BASE admin shell
- Keep token handling and approval state changes backend-owned and security-conscious
- Treat guardian and referee approval as BASE-owned token workflows even though other logged-in approval queues remain TEAM-owned

## pace-core2 delta

Token approval is a standalone workflow, not an authenticated admin shell page.

- Do not use `PaceAppLayout` for this route unless the architecture doc is explicitly changed later
- Use scoped `@solvera/pace-core` primitives for form, state, resilience, and API boundaries only
- Prefer secure service and error-handling patterns over ad hoc client logic
- Treat token lifecycle as a backend contract, not a UI assumption

## pace-core2 imports

Use these `pace-core2` import families when implementing the slice:

- `@solvera/pace-core/components`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/resilience`
- `@solvera/pace-core/services`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`

If the implementation needs permission-aware calls, include `@solvera/pace-core/rbac` and `@solvera/pace-core/providers` only as required by the resolved backend contract.

## Data and schema references

- `base_application_check`
- `base_registration_type_requirement`
- `base_registration_type`
- `base_application`
- `base_application_check.token_hash`
- `base_application_check.token_expires_at`

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

## Open questions

None currently.

## Do not

- Do not use the shared authenticated BASE shell for this route
- Do not invent a token persistence model that conflicts with `base_application_check.token_hash` and `token_expires_at`
- Do not silently accept expired or reused tokens
- Do not couple this flow to the organiser review queue
- Do not preserve legacy token-flow quirks unless they are explicitly re-approved

## References

- [`../project-brief.md`](../project-brief.md)
- [`../architecture.md`](../architecture.md)
- the shared shell contract in [`../architecture.md`](../architecture.md)
- the pace-core2 compliance rules in [`../architecture.md`](../architecture.md)
- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy decision archive)
- [`../../../database/domains/base.md`](../../../database/domains/base.md)
- [`../../../database/decisions/DB-change-decisions-p3.md`](../../../database/decisions/DB-change-decisions-p3.md) (**DB-303** token RPCs)
- the implementation plan in [`../architecture.md`](../architecture.md)
