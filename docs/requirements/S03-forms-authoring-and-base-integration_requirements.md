# S03 Forms Authoring And BASE Integration

## Overview

This slice owns BASE-side form listing, form builder, event-scoped form configuration, and the integration boundary to the shared typed forms platform. It covers the authenticated admin routes `/forms` and `/form-builder`.

## Current legacy baseline

- `/forms` lists event-specific forms, supports preview/share links, and manages deletion.
- `/form-builder` creates or edits forms through tabbed details and fields panes.
- The builder relies on event selection, legacy form context lookups, and RPC-backed field browsing.
- Forms currently use direct table/column field mapping and persistence behavior inherited from the legacy generic engine.
- The current flow still carries legacy assumptions about event-specific forms, preview URLs, and delete checks.

## Rebuild target

- Keep BASE-side form authoring as the admin surface for shared forms-platform records.
- Use the shared forms contract from S02 instead of rebuilding a second form engine.
- Keep event-scoped form setup distinct from downstream workflow orchestration such as application creation.
- Preserve list, create, edit, preview, and delete flows only where they still align with the rebuild contract.
- Ensure form authoring reflects the validated event context and app binding model, not the legacy generic table-binding model.
- Author `core_forms` records using the confirmed workflow-aware contract, including `workflow_type`, `access_mode`, `workflow_config`, and slug-based preview/share behaviour.

## pace-core2 delta

- Use `pace-core2` form primitives, dialog helpers, validation hooks, and shared layout components.
- Replace legacy builder state and RPC-based field browsing with the shared forms contract and `pace-core2` building blocks.
- Use shared RBAC and secure Supabase helpers instead of page-local mutation logic.
- Keep preview and share-link behavior aligned with the shared forms contract, not with legacy URL heuristics.

## pace-core2 imports

- `@solvera/pace-core/components`: `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Button`, `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `Dialog`, `LoadingSpinner`
- `@solvera/pace-core/hooks`: `useUnifiedAuth`, `useEvents`, `useZodForm`, `useFormDialog`, `useToast`
- `@solvera/pace-core/rbac`: `PagePermissionGuard`, `AccessDenied`, `useCan`, `useSecureSupabase`
- `@solvera/pace-core/events`: event context helpers and branded event IDs
- `@solvera/pace-core/utils`: validation, sanitization, and URL helpers
- `@solvera/pace-core/providers`: shared event and organisation providers if the slice needs explicit bootstrap support

## Data and schema references

- Current legacy behavior reads from `core_forms`, `core_form_fields`, `core_form_context_types`, `core_form_responses`, and related field-catalog helpers.
- This slice must consume the shared forms-platform contract from S02.
- `core_form_context_types` and `core_form_field_config` are dropped by the shared forms rescope and must not remain rebuild dependencies.
- Preview/share behavior must use the shared contract for slug, event scope, access mode, and workflow typing rather than inventing local form-routing rules.
- For BASE registration, authoring configures `core_forms` plus `base_form_registration_type`; no separate `base_registration_form` model exists in the approved architecture.

## Acceptance criteria

- `/forms` lists forms for the selected event and supports preview/share/delete flows.
- `/form-builder` can create and edit a form using the shared forms contract.
- Event-scoped configuration is explicit and validated.
- No direct client-side table-write semantics remain in the BASE form-authoring surface.
- Form authoring is permission-gated and does not expose unauthorized edit paths.
- Preview/share links resolve according to the workflow-aware slug contract.

## API / Contract

- Form list contract.
- Form create/edit contract.
- Event-scoped form configuration contract.
- Preview/share-link contract.
- Delete and dependency-check contract.
- Shared forms-platform integration contract.
- BASE registration-type binding contract for `base_registration` forms.

## Visual specification

- Keep `/forms` as a concise management list with clear actions for create, preview, share, edit, and delete.
- Keep `/form-builder` as a focused authoring experience with tabbed detail and field configuration.
- Show event context clearly so operators know which event the form belongs to.
- Preserve clear loading, empty, and denied states; do not bury them in generic error text.

## Verification

- Forms list loads for the selected event.
- Form creation and editing persist through the shared contract.
- Preview and share links resolve to the correct public surface.
- Delete behavior respects dependency checks and permissions.
- The builder cannot proceed without the required event and auth context.
- BASE registration forms can be bound to one or more registration types without inventing a second entrypoint record.

## Testing requirements

- Happy path: a permitted organiser can create, edit, preview, and list forms for the selected event.
- Validation failure: invalid form metadata, missing event context, or invalid field configuration is blocked and reported.
- Auth/permission failure: a user without form authoring permission cannot access or mutate the builder and sees the shared access-denied state.
- Add coverage for delete dependency checks, preview-link generation, event-scoped refetching, and workflow-aware form configuration.

## Open questions

None currently.

## Do not

- Do not recreate the generic legacy form engine in the BASE app.
- Do not keep field selection tied to direct table/column writes.
- Do not depend on `core_form_context_types`, `core_form_field_config`, or legacy field-browse RPCs as rebuild contracts.
- Do not create a participant-facing shell or route surface in BASE for forms.

## References

- [`../project-brief.md`](../project-brief.md)
- [`../architecture.md`](../architecture.md)
- the shared shell contract in [`../architecture.md`](../architecture.md)
- the pace-core2 compliance rules in [`../architecture.md`](../architecture.md)
- the upstream shared forms authority docs
- the implementation plan in [`../architecture.md`](../architecture.md)
