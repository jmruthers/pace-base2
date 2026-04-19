## Overview

This slice owns the organiser-facing registration policy layer for BASE. It covers registration types, eligibility rules, registration-scope consumption, and approval-workflow configuration for the authenticated admin shell.

- Route owned by this slice: `/registration-types`
- Shell contract: authenticated BASE admin/operator routes must follow the shared shell contract in [`../architecture.md`](../architecture.md)
- Route ownership must match the implementation plan in [`../architecture.md`](../architecture.md) exactly

## Current legacy baseline

The legacy app does not provide a trustworthy registration-policy surface. The current codebase does not expose a complete, validated model for registration types, approval checks, or scope-aware policy configuration.

- The legacy app should be treated as observational only
- Any apparent registration configuration in the legacy code is not authoritative for the rebuild
- The current legacy screens do not reflect the validated dev-db workflow structures described in the rebuild docs

## Rebuild target

Provide an organiser/admin surface for defining how registrations work at the event level.

- Create and maintain registration types
- Define eligibility rules and scope constraints per type
- Configure approval-workflow requirements per type from within registration-type setup rather than a detached secondary workflow screen
- Support ordered approval chains using `base_registration_type_requirement.sort_order`
- Support check-type-specific configuration for `guardian_approval`, `home_leader_approval`, and `designated_org_review`
- Show which rules are active, disabled, or pending backend support
- Keep privileged state changes backend-owned rather than client-mutated

## pace-core2 delta

The rebuild must not carry forward legacy `@solvera/pace-core` root-barrel assumptions.

- Use scoped `@solvera/pace-core` entrypoints only
- Prefer branded IDs and shared RBAC helpers instead of raw string propagation
- Treat shell, guard, and layout contracts as `pace-core2` concerns, not page-local inventions
- Replace any page-centric auth or permission logic with shared provider and guard primitives

## pace-core2 imports

Use these `pace-core2` import families when implementing the slice:

- `@solvera/pace-core/providers`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/rbac`
- `@solvera/pace-core/components`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`

Expected concrete usage includes shell, auth, event-context, and permission helpers such as `PaceAppLayout`, `ProtectedRoute`, `PagePermissionGuard`, `AccessDenied`, `useUnifiedAuth`, `useUnifiedAuthContext`, `useEvents`, `useCan`, and `useSecureSupabase` where relevant.

## Data and schema references

- `base_registration_type`
- `base_registration_type_eligibility`
- `base_registration_type_requirement`
- `base_application`
- `base_application_check`
- `core_events.registration_scope`
- `app_base_application_create(p_event_id, p_person_id, p_registration_type_id, ...)`
- `event_applicant_org_allowed(...)`
- `base_application.registration_type_id`
- `base_application.status_updated_at`
- `base_application.status_updated_by`

These structures are validated against dev-db and are the rebuild reference, not the legacy implementation.

Additional workflow authority:

- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy archive — DEC-068)
- [`../../../database/domains/base.md`](../../../database/domains/base.md)

## Acceptance criteria

- Registration types can be created, edited, enabled, and disabled
- Eligibility rules are explicit and event-scoped
- Registration-scope usage is visible and enforced at the policy layer
- Approval-workflow configuration is bound to the registration type editor rather than hidden in unrelated UI or a detached workflow surface
- Approval requirements are ordered explicitly and persisted against `base_registration_type_requirement`
- Type-specific requirement config is captured explicitly:
  - `guardian_approval` can set `require_all_guardians`
  - `home_leader_approval` can set qualifying `role_types`
  - `designated_org_review` can set `reviewing_org_id`
- Privileged registration policy changes are not performed by direct client writes
- The slice-owned routes are recorded only in the implementation plan in [`../architecture.md`](../architecture.md).

## API / Contract

- Registration type read/write contract
- Eligibility-evaluation contract
- Registration-scope gating contract
- Approval-workflow configuration contract
- Ordered requirement-chain configuration contract
- Registration-form content binding contract for policy-aware registration setup
- Backend-owned privileged mutation contract

## Visual specification

Use the shared authenticated shell contract from the shared shell contract in [`../architecture.md`](../architecture.md); do not restate it here.

- The registration-types screen should present a list-first admin view with inline state badges, scope summary, and edit affordances
- Registration-type detail/editing should make approval-chain order, type-specific config, and disabled states obvious at a glance
- Loading, empty, denied, and error states must use the shared shell and shared RBAC fallback patterns

## Verification

- Create a registration type and confirm it persists through reload
- Attach eligibility and confirm scope-aware acceptance and rejection
- Configure an ordered approval workflow and confirm its active/disabled state is reflected correctly
- Update or remove a requirement and confirm the persisted chain order stays coherent
- Attempt access without permission and confirm the shared denial state is shown

## Testing requirements

- Happy path: create and update a registration type with eligible scope and approval config
- Validation failure: reject missing or malformed registration-type or eligibility input
- Auth/permission failure: deny a user without the required admin permission
- Add coverage for scope-denied behaviour, requirement ordering, and type-specific approval-config input if those are surfaced in the implementation

## Open questions

None currently.

## Do not

- Do not preserve legacy registration-policy behaviour solely because it exists today
- Do not collapse approval configuration back into a single flattened status field
- Do not invent a standalone `/approval-workflows` IA if approval configuration lives in registration-type setup
- Do not implement privileged registration changes as direct client-side database writes
- Do not invent a second authenticated shell for these routes
- Do not rely on undocumented legacy import paths or helper names

## References

- [`../project-brief.md`](../project-brief.md)
- [`../architecture.md`](../architecture.md)
- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy decision archive)
- [`../../../database/domains/base.md`](../../../database/domains/base.md)
