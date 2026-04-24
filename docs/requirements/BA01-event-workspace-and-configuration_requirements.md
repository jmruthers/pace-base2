# BA01 Event Workspace And Configuration

## Slice metadata

- Status: Planned
- Depends on: BA00
- Backend impact: Read contract only
- Frontend impact: UI
- Safe for unattended execution: Backend-ready only
- Ownership notes:
  - Backend: Owns event read/write permission contracts and validated `core_events` field scope.
  - Frontend: Owns event dashboard/configuration UI and event-context-driven interaction flows.

## Filename convention

Feature requirement slices use numbered BASE prefixes (`BA##`) and a scope slug:

**`BA01-event-workspace-and-configuration_requirements.md`**

## Overview

This slice owns the event dashboard, event-scoped operational entrypoint, and event configuration. It is the authenticated BASE entrypoint into event-level work and the first slice that relies on the shell from BA00.

## Current baseline behavior

- The legacy app exposes `/event-dashboard` and `/configuration` inside the shared shell.
- The event dashboard composes counts from forms and applications and shows the selected event's metadata, logo, and access level.
- The configuration page loads `core_events` directly and writes back from the client.
- Legacy configuration state assumes a field set that does not match the validated dev-db event shape.
- File/logo handling is currently wired directly from the page instead of through a clearly defined shared contract.

## Rebuild delta

### Summary

- What changes: Establishes event dashboard and configuration as contract-driven, event-scoped workflows.
- What stays: Event context remains shared shell state; non-approved system fields stay out of routine editing.

- Keep the event dashboard as the operational handoff into the BASE event workspace.
- Make event configuration explicitly event-scoped and contract-driven.
- Allow editing of the business-facing `core_events` configuration fields while keeping event ownership and system-managed fields out of normal page editing.
- Treat `core_events.registration_scope` as a real event-level setting rather than an incidental field.
- Preserve event selection as shared shell context, not page-local logic duplicated across feature pages.
- Keep dashboard composition limited to approved operational entrypoints.

### pace-core2 delta

- Replace page-local auth, RBAC, and event-context wiring with shared `pace-core2` providers and hooks.
- Use the shared secure Supabase and permission hooks instead of direct client mutation patterns.
- Use shared file and input components rather than ad hoc page-level field handling.
- Keep the event workspace aligned with `pace-core2` branded IDs and shared context resolution.

### pace-core2 imports

- `@solvera/pace-core/components`: `PaceAppLayout`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `FileDisplay`, `FileUpload`, `Input`, `Textarea`, `Label`, `LoadingSpinner`, `Button`
- `@solvera/pace-core/hooks`: `useUnifiedAuth`, `useEvents`, `useFormDialog`, `useToast`, `useFileDisplay`
- `@solvera/pace-core/rbac`: `PagePermissionGuard`, `AccessDenied`, `useCan`, `useSecureSupabase`
- `@solvera/pace-core/providers`: event and organisation providers if the workspace needs explicit bootstrap support
- `@solvera/pace-core/events`: event read-model helpers and types
- `@solvera/pace-core/utils`: validation and sanitization helpers for event form payloads

### Data and schema references

- `core_events` is the primary event workspace table.
- Validated dev-db shape from the rebuild brief includes `public_readable`, `registration_scope`, `expected_participants`, and `typical_unit_size`.
- Current approved `/configuration` edit scope is the business-facing `core_events` contract:
  - `event_name`
  - `event_date`
  - `event_days`
  - `event_venue`
  - `typical_unit_size`
  - `event_code`
  - `expected_participants`
  - `event_email`
  - `is_visible`
  - `description`
  - `public_readable`
  - `registration_scope`
- Event configuration writes must target `core_events.event_id` as the row selector, using the selected event context identifier.
- `event_id`, `organisation_id`, and audit/system-managed fields must not be editable through the normal `/configuration` flow.
- Event selection and org resolution are shared context concerns, not event-page responsibilities.
- File/logo persistence must align with the shared attachment contract, not with page-local table writes.

## Acceptance criteria

- `/event-dashboard` shows the selected event and approved operational entrypoints.
- `/configuration` loads the current event, validates edits, and saves through the documented contract.
- `/configuration` allows editing of the approved business-facing `core_events` fields and excludes `organisation_id` plus system-managed fields.
- `/configuration` presents editable fields in a two-column form layout.
- `event_date` uses the shared pace-core date picker field surface, not a plain text date input.
- Save actions use the shared footer action primitive with a right-aligned primary `Save` action.
- `registration_scope` is visible and actionable in the event configuration contract.
- Event configuration does not assume legacy field parity.
- Event-specific reads and writes respect shared RBAC.

## API / Contract

- Event dashboard read contract.
- Event configuration read/write contract.
- Event configuration field-scope contract.
- Event selection and event-scoped context contract.
- Logo/file attachment contract.
- Registration scope contract.

## Visual specification

- The event dashboard should present the selected event prominently, followed by a compact grid of operational entrypoints.
- The configuration page should feel like a focused admin form, not a generic data grid.
- Configuration fields should render in a two-column grid to support faster scanning and editing.
- Description should align with the same label/control sizing pattern as other editable fields.
- Date selection should use the shared pace-core date picker field.
- Save actions should be right-aligned in the card footer area and use `Save` as the primary action label.
- Keep logo and media handling embedded in the event context card or form area, not as detached utility UI.
- Use clear loading and denied states so operators know whether the workspace is unavailable or merely unauthorized.

## Verification

- Event selection flows through the shell into both routes.
- Dashboard counts and event metadata load for a permitted user.
- Configuration reads and saves the expected event fields.
- Configuration save targets `core_events.event_id` and does not rely on a non-existent `core_events.id` column.
- Permission-denied states are shown for read and update failures.

## Testing requirements

- Happy path: permitted organiser loads the event dashboard and successfully updates event configuration.
- Validation failure: invalid configuration payloads are rejected with explicit field or contract errors.
- Auth/permission failure: a user without update permission can view only the read state and cannot save configuration.
- UI contract: configuration form renders as two columns, excludes `event_colours`, uses date-picker input for `event_date`, and shows right-aligned `Save` action.
- Add coverage for selected-event absence, event-context loading, and logo/file refresh behavior where relevant.

## Acceptance traceability

- Event dashboard and entrypoint criteria -> `/event-dashboard` event-scoped workspace implementation -> Dashboard metadata/count and permission tests.
- Configuration field-scope criteria -> `/configuration` contract-driven edit surface -> Field allowlist and system-field exclusion tests.
- Registration scope and RBAC criteria -> Shared context + permission hooks/contracts -> Read/update-denied and scope-handling tests.

## Manual QA pack requirements

- Scenarios: Execute all verification flows for event selection, dashboard loading, configuration save, and denied-state behavior.
- Expected outcomes: Dashboard/configuration behavior and field scope match this slice contract for permitted and denied users.

## Build execution rules

- No schema, RPC, or RLS contract changes are permitted in this slice. If such a change is discovered, stop and add it to `docs/delivery/backend-delta-backlog.md` before continuing.
- Stop on blockers: unresolved event schema authority, missing RBAC permissions, unresolved file/logo contract behavior, or failing config validation paths.

## Done criteria

- Tests pass: Dashboard loading, configuration mutation, validation, and permission tests pass in required suites.
- QA passed: Manual QA evidence for verification flows is captured.
- Docs updated: Requirement, architecture references, and event field-scope notes stay aligned.

## Do not

- Do not preserve the legacy `core_events` write shape just because the page currently uses it.
- Do not reimplement event selection independently inside each workspace page.
- Do not assume the legacy dashboard card set is complete.
- Do not expose `organisation_id` or audit/system-managed fields as routine `/configuration` edits.
- Do not hide event-level permission failures behind silent no-ops.

## References

- [`./BA00-base-project-brief.md`](./BA00-base-project-brief.md)
- [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- the shared shell contract in [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- the pace-core2 compliance rules in [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- the implementation plan in [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- BASE feature brief, sections 3 and 9

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (demo app for pace-core, or in-app for consuming apps) as specified in "Testing requirements" and "Verification". Run validate and fix any issues until it passes.

---

**Checklist before running Cursor:** intro doc + guardrails doc + Cursor rules + ESLint config + this requirements doc.
