# BA03 Forms Authoring And BASE Integration

## Slice metadata

- Status: Planned
- Depends on: BA00, BA01, BA02
- Backend impact: Read contract only
- Frontend impact: UI
- Safe for unattended execution: Backend-ready only
- Ownership notes:
  - Backend: Owns shared forms and permission contracts consumed by BASE authoring.
  - Frontend: Owns `/forms` and `/form-builder` authoring, preview/share, and event-scoped UX.

## Filename convention

Feature requirement slices use numbered BASE prefixes (`BA##`) and a scope slug:

**`BA03-forms-authoring-and-base-integration_requirements.md`**

## Overview

This slice owns BASE-side form listing, form builder, event-scoped form configuration, and the integration boundary to the shared typed forms platform. It covers the authenticated admin routes `/forms` and `/form-builder`.

## Current baseline behavior

- `/forms` currently uses an event-scoped list surface with preview/share links and delete controls, but static seed data was used during early BA03 implementation and is not authoritative.
- `/form-builder` creates or edits forms through a focused authoring form for details and field metadata.
- The builder relies on event selection, legacy form context lookups, and RPC-backed field browsing.
- Forms currently use direct table/column field mapping and persistence behavior inherited from the legacy generic engine.
- The current flow still carries legacy assumptions about event-specific forms, preview URLs, and delete checks.
- Implementation note (2026-04-24): list and builder-prefill must read from persisted `core_forms` / `core_form_fields` records in event scope, with backend-owned delete checks.

## Rebuild delta

### Summary

- What changes: Aligns BASE form authoring to the BA02 shared forms contract with workflow-aware configuration.
- What stays: Event-scoped admin authoring remains in BASE; participant-facing routes remain out of scope.

- Keep BASE-side form authoring as the admin surface for shared forms-platform records.
- Use the shared forms contract from BA02 instead of rebuilding a second form engine.
- Keep event-scoped form setup distinct from downstream workflow orchestration such as application creation.
- Preserve list, create, edit, preview, and delete flows only where they still align with the rebuild contract.
- Ensure form authoring reflects the validated event context and app binding model, not the legacy generic table-binding model.
- Author `core_forms` records using the confirmed workflow-aware contract, including `workflow_type`, `access_mode`, `workflow_config`, and slug-based preview/share behaviour.

### pace-core2 delta

- Use `pace-core2` form primitives, dialog helpers, validation hooks, and shared layout components.
- Replace legacy builder state and RPC-based field browsing with the shared forms contract and `pace-core2` building blocks.
- Use shared RBAC and secure Supabase helpers instead of page-local mutation logic.
- Keep preview and share-link behavior aligned with the shared forms contract, not with legacy URL heuristics.

### pace-core2 imports

- `@solvera/pace-core/components`: `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Button`, `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `Dialog`, `LoadingSpinner`
- `@solvera/pace-core/hooks`: `useUnifiedAuth`, `useEvents`, `useZodForm`, `useFormDialog`, `useToast`
- `@solvera/pace-core/rbac`: `PagePermissionGuard`, `AccessDenied`, `useCan`, `useSecureSupabase`
- `@solvera/pace-core/events`: event context helpers and branded event IDs
- `@solvera/pace-core/utils`: validation, sanitization, and URL helpers
- `@solvera/pace-core/providers`: shared event and organisation providers if the slice needs explicit bootstrap support

### Data and schema references

- Current legacy behavior reads from `core_forms`, `core_form_fields`, `core_form_context_types`, `core_form_responses`, and related field-catalog helpers.
- This slice must consume the shared forms-platform contract from BA02.
- `core_form_context_types` and `core_form_field_config` are dropped by the shared forms rescope and must not remain rebuild dependencies.
- Preview/share behavior must use the shared contract for slug, event scope, access mode, and workflow typing rather than inventing local form-routing rules.
- For BASE registration, authoring configures `core_forms` plus `base_form_registration_type`; no separate `base_registration_form` model exists in the approved architecture.

## Acceptance criteria

- `/forms` lists forms for the selected event and supports preview/share/delete flows.
- `/forms` presents each form in a dedicated card and provides explicit add and edit actions.
- `/form-builder` can create and edit a form using the shared forms contract.
- `/form-builder` uses a two-column builder layout on medium and larger screens, with `access_mode` chosen from approved options via a select control.
- Event-scoped configuration is explicit and validated.
- No direct client-side table-write semantics remain in the BASE form-authoring surface.
- Form authoring is permission-gated and does not expose unauthorized edit paths.
- Primary form persistence actions use `SaveActions` from `@solvera/pace-core/components`.
- Preview/share links resolve according to the workflow-aware slug contract.

## API / Contract

- Form list contract: event-scoped read from `core_forms` plus `core_form_fields` (for primary `field_key`) via secure Supabase read path; UI maps `id`, `slug`, `title`, `workflow_type`, `access_mode`, and first `field_key`.
- Form create/edit contract: `app_base_forms_builder_upsert(event_id, title, slug, workflow_type, access_mode, field_key, form_id)` where `form_id` is optional for create and required for stable edit semantics when slug changes.
- Event-scoped form configuration contract.
- Preview/share-link contract: BASE provides author-facing routes for preview/share targets, and these routes must resolve in-shell without falling through to not-found.
- Delete and dependency-check contract: `app_base_form_delete(p_event_id, p_form_id)` returning `deleted`, `response_count`, and `registration_binding_count`.
- Shared forms-platform integration contract.
- BASE registration-type binding contract for `base_registration` forms.

## Visual specification

- Keep `/forms` as a concise management list with clear actions for create, preview, share, edit, and delete.
- Keep `/forms` as a card-based list, with one card per form and clear add/edit actions.
- Use a button control for the add-new action on `/forms`.
- Keep `/form-builder` as a focused authoring experience with a two-column field layout for metadata entry.
- Do not duplicate the selected event identifier within `/forms` or `/form-builder` content when it is already visible in the shared shell header.
- Use a select control for access-mode choices and `SaveActions` for the primary save workflow.
- Preserve clear loading, empty, and denied states; do not bury them in generic error text.

## Verification

- Forms list loads for the selected event.
- Form creation and editing persist through the shared contract.
- Preview and share links resolve via BASE author-facing targets without returning a not-found page.
- Delete behavior respects dependency checks and permissions.
- The builder cannot proceed without the required event and auth context.
- BASE registration forms can be bound to one or more registration types without inventing a second entrypoint record.

## Testing requirements

- Happy path: a permitted organiser can create, edit, preview, and list forms for the selected event.
- Validation failure: invalid form metadata, missing event context, or invalid field configuration is blocked and reported.
- Auth/permission failure: a user without form authoring permission cannot access or mutate the builder and sees the shared access-denied state.
- Add coverage for delete dependency checks, preview-link generation, event-scoped refetching, and workflow-aware form configuration.

## Acceptance traceability

- Forms list and builder criteria -> `/forms` and `/form-builder` implementation boundaries -> List/create/edit/preview/delete tests.
- Event scope and contract criteria -> Event-scoped shared forms integration contract -> Event-context and workflow-config validation tests.
- Permission and preview/share criteria -> RBAC guard paths + link-generation contract -> Denied access and preview/share resolution tests.

## Manual QA pack requirements

- Scenarios: Execute verification flows for list, create/edit, preview/share, delete dependency checks, and missing-context handling.
- Expected outcomes: Authoring and integration behavior match shared forms contracts and permission boundaries.

## Build execution rules

- No schema, RPC, or RLS contract changes are permitted in this slice. If such a change is discovered, stop and add it to `docs/delivery/backend-delta-backlog.md` before continuing.
- Stop on blockers: BA02 contract mismatches, unresolved event-context dependencies, missing permission mappings, or failing preview/delete flows.

## Done criteria

- Tests pass: Form authoring, workflow config, preview/share, dependency-check, and permission tests pass.
- QA passed: Manual QA evidence for verification scenarios is captured.
- Docs updated: BA03 stays aligned with BA02 and architecture references.

## Do not

- Do not recreate the generic legacy form engine in the BASE app.
- Do not keep field selection tied to direct table/column writes.
- Do not depend on `core_form_context_types`, `core_form_field_config`, or legacy field-browse RPCs as rebuild contracts.
- Do not create a participant-facing shell or route surface in BASE for forms.

## References

- [`./BA00-base-project-brief.md`](./BA00-base-project-brief.md)
- [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- the shared shell contract in [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- the pace-core2 compliance rules in [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- the upstream shared forms authority docs
- the implementation plan in [`./BA00-base-architecture.md`](./BA00-base-architecture.md)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (demo app for pace-core, or in-app for consuming apps) as specified in "Testing requirements" and "Verification". Run validate and fix any issues until it passes.

---

**Checklist before running Cursor:** intro doc + guardrails doc + Cursor rules + ESLint config + this requirements doc.
