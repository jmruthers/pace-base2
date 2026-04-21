# BA15 Reporting

## Slice metadata

- Status: Planned
- Depends on: BA06, BA08, BA11, BA14
- Backend impact: Read contract only
- Frontend impact: UI
- Safe for unattended execution: No
- Ownership notes:
  - Backend: Owns field catalog/template/query permission contracts and shared reporting engine behavior.
  - Frontend: Owns `/reports` consumer UI composition and template lifecycle UX under shared engine.

## Filename convention

Feature requirement slices use numbered BASE prefixes (`BA##`) and a scope slug:

**`BA15-reporting_requirements.md`**

## Overview
This slice owns `/reports` as the BASE event-scoped consumer of the shared reporting capability. It covers explore selection, report field discovery, query building, saved templates, export, and the UI needed to query data through the shared reporting engine.

**Gate:** BASE **BA15 implementation is blocked until [`CR22-shared-reporting-foundations.md`](../../../../packages/core/docs/requirements/CR22-shared-reporting-foundations.md) is complete** in `@solvera/pace-core`. Architecture and requirements remain authorable; shipping code waits on CR22 shared reporting foundations.

This slice is authorable now from confirmed upstream authority, but implementation completion depends on the upstream `pace-core2` reporting foundations landing first.

## Current baseline behavior
The legacy app supports `/reports` and saved templates. It also depends on legacy RPC-based field discovery such as `data_core_field_list_report`, which is not authoritative for the rebuild and must not be carried forward without explicit approval.

## Rebuild delta

### Summary

- What changes: Rebuilds BASE reporting as a consumer of shared reporting foundations across approved explores.
- What stays: Event-scoped visibility and creator-owned template edit/delete authority remain explicit.
Provide an organiser-facing reporting experience that:
- stays event-scoped
- consumes the shared reporting engine rather than inventing BASE-local reporting semantics
- uses the approved app/domain explore contract and runtime event scope
- exposes only explicitly reportable fields and approved explores
- lets users build, save, reload, and export reports
- makes field availability and template ownership explicit
- keeps edit and delete authority on `/reports` with the template creator even when a template is event-shared
- avoids prefix-based or RPC-only assumptions that would let stale metadata drive the rebuild
- treats `participant`, `unit`, `activity`, and `scan` as the approved BASE reporting domains for the rebuild

### pace-core2 delta
`pace-core2` provides the shared shell, auth, RBAC, secure client, common UI primitives, and the shared reporting engine. BASE must consume that shared engine rather than building a BASE-only reporting contract.

- Consuming-app implementation must use shared reporting components/hooks/services from `@solvera/pace-core` before introducing local replacements for query builder pieces, filters, table primitives, template dialogs, or permission guards.

### pace-core2 imports
- `@solvera/pace-core/components`: `PaceAppLayout`, `ProtectedRoute`, `LoadingSpinner`, `DataTable`, `Tabs`, `Dialog`, `ConfirmationDialog`, `Button`, `Card`, `Input`, `Select`, `Textarea`, `Checkbox`, `Badge`
- `@solvera/pace-core/hooks`: `useEvents`, `useEventService`, `useZodForm`, `useFormDialog`, `useToast`
- `@solvera/pace-core/providers`: `useUnifiedAuthContext`
- `@solvera/pace-core/rbac`: `PagePermissionGuard`, `AccessDenied`, `useCan`, `useSecureSupabase`

### Data and schema references
- `core_field_list`: authoritative field catalog source for reporting metadata
- `core_report_template`: persisted saved-report template data
- `base_application`: BASE participant reporting base table
- `base_units`: BASE unit reporting base table
- `base_activity_booking`: BASE activity reporting base table
- `base_scan_event`: BASE scan reporting base table
- explore config in shared reporting code: authoritative join topology for BASE reporting
- `core_events`, `core_member`, `core_person`, `base_activity_session`, `base_activity_offering`, `base_scan_point`, and other approved related tables as enabled by shared explores and field metadata
- Upstream implementation authority for this slice is [`../../../../packages/core/docs/requirements/CR22-shared-reporting-foundations.md`](../../../../packages/core/docs/requirements/CR22-shared-reporting-foundations.md) (**Reporting architecture (canonical)**).

Approved reporting architecture for this slice:

- `core_field_list` is the authoritative reporting field catalog source
- `report_availability` remains the primary gate on whether a field can appear in reporting
- `report_domains`, `aggregate_strategy`, and `aggregate_config` extend the reporting field contract
- join topology is not stored in `core_field_list`; it is owned by shared TypeScript explore config
- the legacy `data_core_field_list_report` function is not authoritative; it may only survive as an implementation helper if it remains a thin wrapper over the same metadata contract
- BASE uses shared explores with `event_id` runtime scope:
  - `base.participant`
  - `base.unit`
  - `base.activity`
  - `base.scan`
- `core_report_template` persists templates with `domain_id`, `app_id`, `sort_config`, and `column_config` in addition to existing ownership fields
- `core_report_template.is_private = true` means the template is private to its creator
- `core_report_template.is_private = false` means the template is shared within the event context
- event-shared visibility does not grant shared edit or delete authority on `/reports`; creator ownership remains the default management rule
- if an event-admin shared-template maintenance surface is later approved, it should be specified as a separate route or surface rather than folded into default `/reports` behaviour
- BASE reporting scope for this rebuild remains `base.participant`, `base.unit`, `base.activity`, and `base.scan`; do not reduce implementation scope to participant-only reporting.

MVP non-functional constraints for this slice:

- report execution must always remain event-scoped; cross-event query execution is out of scope
- export uses the same validated query definition shown in the UI; no hidden export-only query path is allowed
- if a query exceeds current shared-engine limits, the UI must show an explicit limit or timeout error instead of silent truncation

## Acceptance criteria
- `/reports` loads inside the shared authenticated BASE shell.
- A user can build a report from the approved BASE participant, unit, activity, and scan explores using reportable fields only.
- A user can save a template, reload it, and export the resulting report.
- Template visibility and ownership rules are explicit in the UI and enforced by the backend contract.
- Only the template creator can edit or delete a template from `/reports`, including when the template is event-shared.
- Unsupported fields, filters, or empty report definitions fail validation clearly.
- Users without report permission see access denied instead of a partial report builder.
- BASE does not assemble its own join logic outside the shared explore contract.

## API / Contract
- Report field catalog contract sourced from `core_field_list` reporting metadata.
- App/domain explore contract sourced from the shared reporting engine.
- Report query contract for filters, grouping, sorting, and export.
- Saved report-template contract using `core_report_template` with app/domain metadata plus private-versus-event-shared semantics via `is_private`.
- Template ownership contract where creator ownership governs edit and delete actions on `/reports` irrespective of shared visibility.
- Permission contract for reading report data and managing templates.

## Visual specification
Use the shared authenticated BASE shell and follow the shared shell contract in [`./BA00-base-architecture.md`](./BA00-base-architecture.md). The reporting page should feel like a dense workstation, not a generic form:
- left or top field catalog
- central query builder
- results table with export controls
- saved-template browser or drawer
- clear event context in the shell

## Verification
- Build a report from each approved BASE explore and confirm results load.
- Save the report as a template, reload it, and confirm the query state restores correctly.
- Export the report and confirm the exported data matches the active query.
- Confirm a non-creator can use an event-shared template but cannot edit or delete it from `/reports`.
- Try an unsupported field or filter and confirm validation rejects it.
- Attempt access with an unauthorised role and confirm access is denied.

## Testing requirements
- Happy path: build, save, reload, and export a valid report.
- Validation failure: reject unsupported fields or an empty report definition.
- Auth/permission failure: block report access or template management for a user without permission.
- Add coverage for BASE participant, unit, activity, and scan explore selection, runtime event scope, aggregation-aware field validation, and creator-only edit/delete authority for event-shared templates on `/reports`.

## Acceptance traceability

- Shell/explore coverage criteria -> `/reports` integration with shared engine explores -> Multi-domain explore selection and query tests.
- Template lifecycle criteria -> Save/reload/export + ownership/visibility contract -> Template persistence, creator-only edit/delete, and shared-visibility tests.
- Validation/permission criteria -> Field/report validation + RBAC enforcement -> Unsupported-field and unauthorized access tests.

## Manual QA pack requirements

- Scenarios: Execute verification flows for building reports across approved explores, saving/reloading templates, export, ownership controls, and denied access.
- Expected outcomes: Reporting remains event-scoped, shared-engine-driven, and ownership-enforced.

## Build execution rules

- No schema, RPC, or RLS contract changes are permitted in this slice. If such a change is discovered, stop and add it to `docs/delivery/backend-delta-backlog.md` before continuing.
- Stop on blockers: CR22 incomplete or unavailable, unresolved field catalog/explore metadata contract, or missing template ownership enforcement.

## Done criteria

- Tests pass: Report build/query, template lifecycle/ownership, validation, and permission tests pass.
- QA passed: Manual QA evidence for verification scenarios is captured.
- Docs updated: BA15 remains aligned with CR22 authority and BASE reporting scope.

## Do not
- Do not assume every `base_` or `core_` table is reportable.
- Do not hide field-catalog dependencies behind undocumented RPCs.
- Do not build a second authenticated shell for reporting.
- Do not build a BASE-only report-builder contract when the reporting capability is intended to move into `pace-core2`.
- Do not duplicate shared reporting UI/hooks in local app code when equivalent `@solvera/pace-core` surfaces exist.
- Do not store join topology in `core_field_list`.
- Do not let reporting drive application architecture.
- Do not preserve the legacy field-prefix discovery model unless the rebuild docs explicitly reapprove it.
- Do not let event-shared visibility imply shared edit/delete authority on `/reports`.

## References
- [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- [`./BA00-base-project-brief.md`](./BA00-base-project-brief.md)
- [`../../../../packages/core/docs/requirements/CR22-shared-reporting-foundations.md`](../../../../packages/core/docs/requirements/CR22-shared-reporting-foundations.md)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (demo app for pace-core, or in-app for consuming apps) as specified in "Testing requirements" and "Verification". Run validate and fix any issues until it passes.

---

**Checklist before running Cursor:** intro doc + guardrails doc + Cursor rules + ESLint config + this requirements doc.
