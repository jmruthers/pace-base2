## Overview

S08 owns the event-scoped units and group coordination surface. It covers `/units` and `/unit-preferences`, with the shared authenticated BASE shell used for both routes under the shared layout contract.

This slice preserves the useful parts of the legacy units screen, but it is not bound to the legacy table-first implementation. The rebuild contract is broader: unit hierarchy, unit roles, and ranked sub-unit preference submission are separate concerns and must stay separate in the UI and data contract.

## Current legacy baseline

- The legacy app already has a `/units` route with hierarchical unit CRUD, unit role types, and unit role assignment against applications.
- The current screen is built around a dense data table plus tabs for units and role assignment.
- The legacy implementation writes directly through Supabase repository code and uses page-local validation and confirmation flows.
- No legacy UI exists for ranked sub-unit preferences.

## Rebuild target

- Keep event-scoped unit hierarchy management for organisers who still need it.
- Keep unit-role management for applications where that workflow remains required.
- Add ranked sub-unit preference submission as its own bounded context, with `/unit-preferences` owning preference capture instead of hiding it inside booking or generic admin tooling.
- Keep preference submission separate from booking allocation and do not auto-convert preferences into bookings.
- Treat unit preferences as draftable until explicit submit, then read-only for MVP.
- Preserve event context and permission boundaries explicitly rather than inferring them from the current legacy screen.

## pace-core2 delta

- Use `pace-core2` scoped entrypoints for shell, shared cards/tables/dialogs, query helpers, and RBAC instead of legacy root imports.
- Use branded IDs and shared event hooks at the app boundary rather than passing raw strings through the feature layer.
- Prefer `useZodForm`, shared data-table primitives, and `PagePermissionGuard` over page-local form and permission glue.
- Do not copy the current tab/table composition mechanically if `pace-core2` has a clearer fit for hierarchy and preference editing.

## pace-core2 imports

- `@solvera/pace-core/components`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/rbac`
- `@solvera/pace-core/events`
- `@solvera/pace-core/types`
- `@solvera/pace-core/crud`
- `@solvera/pace-core/utils`

## Data and schema references

- `base_units`
- `base_unit_role_types`
- `base_unit_roles`
- `rbac_user_units`
- `base_application`
- `core_events`
- `base_activity_preference` with `unit_id`, `session_id`, `rank`, `submitted_at`, and `submitted_by`
- MVP preference finality uses the existing `submitted_at` and `submitted_by` fields as the submission boundary; reopen/reset behaviour is out of scope.

## Acceptance criteria

- `/units` remains an event-scoped organiser surface for unit hierarchy and unit role management.
- `/unit-preferences` captures ranked preferences as a separate workflow, not as a side effect of unit CRUD or booking.
- Unit create, edit, delete, and import behaviour are explicit and permission-gated.
- Role type create, edit, and delete behaviour is explicit and permission-gated.
- Preference ranking rules are documented and enforced in the rebuild contract.
- Preference sets remain editable until explicit submit and become read-only after submit in MVP.

## API / Contract

- Unit CRUD contract for event-scoped hierarchy management.
- Unit role type CRUD contract.
- Unit role assignment and removal contract against applications.
- Ranked preference submission contract for `base_activity_preference`.
- Preference draft-versus-submitted contract.
- Route ownership contract for `/units` and `/unit-preferences`.

## Visual specification

- Use the shared authenticated BASE shell and the shared layout contract.
- Present units as a dense admin surface with hierarchy first, then role assignment, then preference work in a separate view.
- Keep preference capture rank-centric and visually distinct from unit CRUD so it cannot be mistaken for booking allocation.
- Show event context clearly and keep destructive actions visually guarded.

## Verification

- Create, edit, and delete a unit in an event-scoped context.
- Create, edit, and delete a unit role type.
- Assign and remove an application-linked role for a unit.
- Build a draft preference set, reorder it, and confirm it remains editable before submit.
- Submit a ranked preference set and verify the recorded ordering.
- Confirm the submitted preference set is read-only.
- Confirm denied access for unauthorised users.

## Testing requirements

- Happy path: create a unit, assign a role type, and submit a ranked preference set.
- Validation failure: reject invalid unit numbers and invalid or duplicate preference ranks.
- Auth/permission failure: reject unit writes, role edits, and preference submission for users without the required page permission.
- Add coverage for editable draft state before submit and locked read-only state after submit.

## Open questions

None currently.

## Do not

- Do not merge preference submission into booking allocation.
- Do not auto-allocate bookings from preferences without explicit approval.
- Do not introduce reopen/reset workflow semantics in MVP.
- Do not preserve the legacy import/table UX if it conflicts with the rebuild contract.
- Do not use page-local RBAC or raw string ID handling when `pace-core2` provides the boundary primitives.

## References

- [`../project-brief.md`](../project-brief.md)
- [`../architecture.md`](../architecture.md)
