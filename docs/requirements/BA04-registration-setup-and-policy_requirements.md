# BA04 Registration Setup And Policy

## Slice metadata

- Status: Planned
- Depends on: BA01, BA02, BA03
- Backend impact: Read contract only
- Frontend impact: UI
- Safe for unattended execution: Backend-ready only
- Ownership notes:
  - Backend: Owns registration-type, eligibility, requirement-chain, and privileged mutation contracts.
  - Frontend: Owns organiser policy configuration surface and explicit requirement-chain UX.

## Filename convention

Feature requirement slices use numbered BASE prefixes (`BA##`) and a scope slug:

**`BA04-registration-setup-and-policy_requirements.md`**

## Overview

This slice owns the organiser-facing registration policy layer for BASE. It covers registration types, eligibility rules, registration-scope consumption, and approval-workflow configuration for the authenticated admin shell.

- Route owned by this slice: `/registration-types`
- Shell contract: authenticated BASE admin/operator routes must follow the shared shell contract in [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- Route ownership must match the implementation plan in [`./BA00-base-architecture.md`](./BA00-base-architecture.md) exactly

## Current baseline behavior

The legacy app does not provide a trustworthy registration-policy surface. The current codebase does not expose a complete, validated model for registration types, approval checks, or scope-aware policy configuration.

- The legacy app should be treated as observational only
- Any apparent registration configuration in the legacy code is not authoritative for the rebuild
- The current legacy screens do not reflect the validated dev-db workflow structures described in the rebuild docs

## Rebuild delta

### Summary

- What changes: Introduces event-scoped registration policy setup with explicit eligibility and ordered approval configuration.
- What stays: Shared shell and backend-owned privileged mutation boundaries remain authoritative.

Provide an organiser/admin surface for defining how registrations work at the event level.

- Create and maintain registration types
- Define eligibility rules and scope constraints per type
- Configure approval-workflow requirements per type from within registration-type setup rather than a detached secondary workflow screen
- Support ordered approval chains using `base_registration_type_requirement.sort_order`
- Support check-type-specific configuration for `guardian_approval`, `home_leader_approval`, and `designated_org_review`
- Show which rules are active, disabled, or pending backend support
- Keep privileged state changes backend-owned rather than client-mutated

Requirement-state definitions for this slice:

- `active`: persisted configuration is valid, backend contracts are available, and the requirement participates in submission/review decisions.
- `disabled`: persisted configuration exists but is intentionally turned off for new submissions in this event scope.
- `pending_backend_support`: the organiser can view draft configuration, but save or enable actions are blocked because required backend contracts are not yet available in the linked backend-delta backlog.

### pace-core2 delta

The rebuild must not carry forward legacy `@solvera/pace-core` root-barrel assumptions.

- Use scoped `@solvera/pace-core` entrypoints only
- Prefer branded IDs and shared RBAC helpers instead of raw string propagation
- Treat shell, guard, and layout contracts as `pace-core2` concerns, not page-local inventions
- Replace any page-centric auth or permission logic with shared provider and guard primitives

### pace-core2 imports

Use these `pace-core2` import families when implementing the slice:

- `@solvera/pace-core/providers`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/rbac`
- `@solvera/pace-core/components`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`

Expected concrete usage includes shell, auth, event-context, and permission helpers such as `PaceAppLayout`, `ProtectedRoute`, `PagePermissionGuard`, `AccessDenied`, `useUnifiedAuth`, `useUnifiedAuthContext`, `useEvents`, `useCan`, and `useSecureSupabase` where relevant.

### Data and schema references

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
- The slice-owned routes are recorded only in the implementation plan in [`./BA00-base-architecture.md`](./BA00-base-architecture.md).

## API / Contract

- Registration type read/write contract
- Eligibility-evaluation contract
- Registration-scope gating contract
- Approval-workflow configuration contract
- Ordered requirement-chain configuration contract
- Registration-form content binding contract for policy-aware registration setup
- Backend-owned privileged mutation contract

## Visual specification

Use the shared authenticated shell contract from the shared shell contract in [`./BA00-base-architecture.md`](./BA00-base-architecture.md); do not restate it here.

- The registration-types screen should present a list-first admin view with inline state badges, scope summary, and edit affordances
- Registration-type detail/editing should make approval-chain order, type-specific config, and disabled states obvious at a glance
- Loading, empty, denied, and error states must use the shared shell and shared RBAC fallback patterns
- Do not duplicate the selected event identifier in registration policy page content when it is already visible in the shared shell header
- Use a two-column field layout for primary registration policy metadata on medium and larger screens
- Primary policy persistence uses `SaveActions` from `@solvera/pace-core/components`
- Registration scope uses a select control bound to the contract allowlist (`open`, `hierarchy`, `org_only`, `invite_only`, `closed`)
- Policy save calls `app_base_registration_policy_upsert` with PostgREST-named parameters; the `requirements` argument is a JSON object whose `requirement_rules` entries use `check_type`, `sort_order`, and `is_automated` as consumed by `app_base_registration_type_upsert` in pace-core2

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

## Acceptance traceability

- Registration type and eligibility criteria -> Registration type editor + eligibility policy contract -> Create/edit/enable/disable and eligibility tests.
- Approval chain criteria -> Ordered requirement-chain configuration implementation -> Sort order and type-specific requirement config tests.
- Privileged mutation and RBAC criteria -> Backend-owned mutation paths + permission guards -> Unauthorized and denied-mutation tests.

## Manual QA pack requirements

- Scenarios: Execute verification flows for type creation, eligibility setup, ordered requirements, and denied-access handling.
- Expected outcomes: Policy setup reflects persisted requirement ordering, scope behavior, and permission constraints.

## Build execution rules

- No schema, RPC, or RLS contract changes are permitted in this slice. If such a change is discovered, stop and add it to `docs/delivery/backend-delta-backlog.md` before continuing.
- Stop on blockers: unresolved requirement-chain contract behavior, missing permission scopes, or unavailable backend mutation boundaries.

## Done criteria

- Tests pass: Registration type, eligibility, requirement-ordering, and permission tests pass.
- QA passed: Manual QA evidence for verification scenarios is captured.
- Docs updated: BA04 remains aligned with architecture and database authority references.

## Do not

- Do not preserve legacy registration-policy behaviour solely because it exists today
- Do not collapse approval configuration back into a single flattened status field
- Do not invent a standalone `/approval-workflows` IA if approval configuration lives in registration-type setup
- Do not implement privileged registration changes as direct client-side database writes
- Do not invent a second authenticated shell for these routes
- Do not rely on undocumented legacy import paths or helper names

## References

- [`./BA00-base-project-brief.md`](./BA00-base-project-brief.md)
- [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy decision archive)
- [`../../../database/domains/base.md`](../../../database/domains/base.md)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (demo app for pace-core, or in-app for consuming apps) as specified in "Testing requirements" and "Verification". Run validate and fix any issues until it passes.

---

**Checklist before running Cursor:** intro doc + guardrails doc + Cursor rules + ESLint config + this requirements doc.
