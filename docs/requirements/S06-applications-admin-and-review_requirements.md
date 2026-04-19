## Overview

This slice owns the organiser-facing application review surface in the authenticated BASE shell.

- Route owned by this slice: `/applications`
- Shell contract: authenticated BASE admin/operator routes must follow the shared shell contract in [`../architecture.md`](../architecture.md)
- Route ownership must match the implementation plan in [`../architecture.md`](../architecture.md) exactly

## Current legacy baseline

The legacy app has an applications screen, but it does not reflect the rebuild-grade review model.

- The current surface is closer to a partial read-only list than a structured review queue
- Legacy application status handling is flattened relative to the rebuilt approval model
- The legacy app does not provide a reliable check-level review surface
- Any direct mutation patterns in the legacy code are observational only and not authoritative

## Rebuild target

Provide a review queue and detail surface for organiser application operations.

- Show event-scoped applications with meaningful queue, filter, and review affordances
- Expose check-level review context instead of collapsing everything into one status value
- Support application-level status operations through backend-owned contracts only
- Surface the relationship between applications, registration type, checks, and approval requirements
- Allow event admins to approve or reject submitted or `under_review` applications in MVP even when checks remain unresolved
- Provide a review-steps modal that shows review steps and current progress
- Keep review steps read-only in MVP for pass/fail/waive mutation; token-request reissue for pending guardian/referee checks is allowed through an explicit backend contract
- Make token-based request issuance/reissue visible in organiser detail so approval workflows are not backend-only black boxes
- Keep organiser application detail scoped to application-linked evidence and review context rather than turning it into a generic person-history viewer
- Keep TEAM-owned pending-approval queues for logged-in actors out of BASE IA in this slice
- Keep the organiser view inside the shared authenticated shell

## pace-core2 delta

The rebuild should use shared shell, guard, and data-access primitives instead of legacy page-local glue.

- Prefer scoped `@solvera/pace-core` entrypoints only
- Use branded IDs and shared permission helpers
- Replace direct client mutation patterns with secure service or mutation boundaries
- Treat list/detail layout and loading states as shared concerns rather than bespoke page code

## pace-core2 imports

Use these `pace-core2` import families when implementing the slice:

- `@solvera/pace-core/providers`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/rbac`
- `@solvera/pace-core/components`
- `@solvera/pace-core/crud`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`

Expected concrete usage includes `PaceAppLayout`, `PagePermissionGuard`, `AccessDenied`, `useUnifiedAuth`, `useEvents`, `useCan`, `useSecureSupabase`, and list/detail helpers where needed.

## Data and schema references

- `base_application`
- `base_application_check`
- `base_registration_type`
- `base_registration_type_requirement`
- `base_registration_type_eligibility`
- `core_events.registration_scope`
- `base_application.registration_type_id`
- `base_application.status_updated_at`
- `base_application.status_updated_by`
- `base_application_check.token_hash`
- `base_application_check.token_expires_at`
- Live backend validation currently confirms:
  - application creation is handled by `public.app_base_application_create(...)`
  - authenticated users can update `base_application` through RBAC-controlled access
  - authenticated users can read `base_application_check`
  - dedicated backend contracts for mutating individual review checks were not found in the current dev-db and therefore pass/fail/waive step mutation is not part of BASE MVP
- `DEC-068` and `docs/database/domains/base.md` are the authority for ordered requirement chains, `under_review`, token storage on `base_application_check`, and type-specific failure behaviour.
- MVP application-level status changes may move an application beyond the state implied by currently unresolved checks; unresolved checks must remain visible in the organiser UI when that happens.
- Organiser authority in BASE is final application-level authority, not a replacement for the optional `event_approval` check type.

The review queue must be derived from the validated workflow tables, not from legacy table-prefix assumptions.

## Acceptance criteria

- The applications page lists organiser-visible applications for the current event
- Filters and queue state reflect registration type, status, and review context
- Detail view exposes check-level context instead of flattening the workflow
- Detail view stays scoped to application-linked evidence and review context; unrelated person or event form history is not surfaced here
- Event admins can approve or reject submitted or `under_review` applications irrespective of unresolved checks
- Status operations are backend-owned and permission-checked
- A review modal exposes ordered review steps and current progress
- Review steps are read-only in MVP for pass/fail/waive actions
- Pending guardian/referee checks expose a resend/reissue action through a backend-owned contract that invalidates the previous token before issuing a new one
- When an organiser manually moves an application to `approved` or `rejected` while checks remain unresolved, the unresolved checks remain visible
- Logged-in actor approval steps remain visible as workflow context, but TEAM queue/action UX is not reimplemented inside BASE
- Unauthorized users cannot access or mutate the review surface

## API / Contract

- Application list/query contract
- Application detail read contract
- Application-linked evidence contract for review detail
- Check-level review contract
- Application-level status operation contract
- Approval-request issuance/reissue contract for token-driven checks
- Review-steps modal contract
- Review queue permission contract

## Visual specification

Use the shared authenticated shell contract from the shared shell contract in [`../architecture.md`](../architecture.md); do not restate it here.

- The applications screen should use a master-detail or list-plus-drawer pattern that keeps the queue readable
- Primary summary counts, review badges, pending-check state, and permission states should be visible without drilling into the record
- Loading, empty, error, and denied states must use the shared shell and shared RBAC fallback patterns

## Verification

- Open the applications page and confirm the queue loads for the current event
- Filter by status or registration type and confirm the queue updates correctly
- Open an application and confirm check-level detail is visible
- Confirm the detail view does not expose unrelated person-history or same-event non-application form responses
- Change a submitted or `under_review` application to `approved` or `rejected` and confirm the update succeeds through the application-level contract
- Reissue a pending guardian or referee request and confirm the previous token is no longer valid
- Confirm the review modal remains read-only for individual pass/fail/waive step mutation
- Attempt a review action without permission and confirm the access-denied state is shown

## Testing requirements

- Happy path: load the queue, open an application, and perform an allowed review action
- Validation failure: reject malformed review input or invalid status-transition data
- Auth/permission failure: deny a user without the required review permission
- Add coverage for queue filters, check-level rendering, read-only review steps, token-request reissue, manual application-status changes, denied mutation states, and non-exposure of unrelated person-history form data

## Open questions

None currently.

## Do not

- Do not flatten check-level detail into a status-only list
- Do not keep direct client mutation of application state
- Do not implement individual pass/fail/waive review-step mutation in MVP without explicit backend contracts
- Do not reimplement TEAM pending-approval queue UX inside BASE
- Do not create a second shell or custom nav for this route
- Do not rely on legacy status assumptions that conflict with the rebuild docs
- Do not invent route ownership beyond `/applications`
- Do not broaden organiser application detail into a generic person-history viewer for arbitrary form responses

## References

- [`../project-brief.md`](../project-brief.md)
- [`../architecture.md`](../architecture.md)
- the shared shell contract in [`../architecture.md`](../architecture.md)
- the pace-core2 compliance rules in [`../architecture.md`](../architecture.md)
- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy decision archive)
- [`../../../database/domains/base.md`](../../../database/domains/base.md)
- the implementation plan in [`../architecture.md`](../architecture.md)
