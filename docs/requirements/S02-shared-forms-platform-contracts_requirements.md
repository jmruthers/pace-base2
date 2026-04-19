# S02 Shared Forms Platform Contracts

## Overview

This slice owns the shared typed forms-platform contract for PACE. It defines the reusable form model, workflow typing, field identity, submission contract, and the shared data-model changes that sit above `pace-core2` primitives. It has no routes.

This slice is authorable now from confirmed upstream authority, but BASE implementation that depends on it is blocked until the upstream `pace-core2`/database work lands.

## Current legacy baseline

- The legacy forms engine is built around `table_name` and `column_name` bindings.
- Form rendering, submission, and persistence all assume generic client-side writes into domain tables.
- The form builder depends on legacy RPCs and event-specific context resolution.
- Current forms code uses the same field identity scheme for display, response capture, and persistence, which makes the engine own downstream workflow semantics.
- Legacy forms are already coupled to BASE application creation behavior even though that should be a workflow contract, not a generic form behavior.

## Rebuild target

- Introduce a shared typed forms platform that sits between `pace-core2` primitives and app-specific workflows.
- Make workflow typing explicit, with shared support for reusable and app-owned workflows.
- Replace generic table/column write ownership with semantic field keys and explicit workflow orchestration.
- Keep BASE-specific workflow semantics out of the shared primitives.
- Define the shared contracts needed for registration, information collection, activity booking, consent capture, and other typed workflows.
- Align the shared contract to the confirmed forms-platform rescope rather than earlier draft binding-table assumptions.

## pace-core2 delta

- Use `pace-core2` for field primitives, rendering primitives, validation helpers, and reusable form UI.
- Do not require `pace-core2` to own BASE-specific application creation or approval semantics.
- Use `pace-core2` hooks and components as building blocks for the shared forms platform, not as the place where workflow ownership is hidden.
- Keep domain persistence and workflow side effects outside the core form primitives.

## pace-core2 imports

- `@solvera/pace-core/components`: `Form`, `FormField`, `Input`, `Textarea`, `Checkbox`, `Tabs`, `Dialog`, `DataTable` where relevant to shared authoring and preview tooling
- `@solvera/pace-core/hooks`: `useZodForm`, `useFormDialog`, `useUnifiedAuth`, `useEvents`
- `@solvera/pace-core/rbac`: `useSecureSupabase`, `useCan`, `PagePermissionGuard`, `AccessDenied`
- `@solvera/pace-core/utils`: validation and sanitization helpers
- `@solvera/pace-core/types`: branded IDs and shared form types
- `@solvera/pace-core/events`: event-scoped context helpers

## Data and schema references

- Current dev-db baseline from the rebuild brief: `core_forms`, `core_form_fields`, `core_form_responses`, `core_form_response_values`, `core_form_context_types`, and `core_form_field_config`.
- Confirmed shared forms direction:
  - drop `core_form_context_types`
  - drop `core_form_field_config`
  - add `workflow_type`, `owner_app_id`, `access_mode`, and `workflow_config` to `core_forms`
  - replace `table_name` / `column_name` with `field_key` on `core_form_fields`
  - replace `target_table` / `target_record_id` with `workflow_subject_type` / `workflow_subject_id` on `core_form_responses`
  - replace `table_name` / `column_name` with `field_key` on `core_form_response_values`
- For BASE registration, the shared contract is consumed through `core_forms` plus `base_form_registration_type`; superseded `base_registration_form` and `base_registration_form_type` assumptions must not be carried forward.
- Upstream implementation authority for this slice is:
  - [`../../ARC-CORE-forms-platform-rescope.md`](../../ARC-CORE-forms-platform-rescope.md)
  - [`../../../../packages/core/docs/requirements/CR23-workflow-forms-runtime.md`](../../../../packages/core/docs/requirements/CR23-workflow-forms-runtime.md)

## Acceptance criteria

- The shared forms model distinguishes workflow typing from rendering primitives.
- The canonical workflow taxonomy includes `base_registration`, `information_collection`, `activity_booking`, `merch_order`, `consent_capture`, and `generic`.
- Field identity is semantic and stable, not a raw persistence target.
- Generic table/column writes are not the default or implied contract.
- BASE workflow semantics are documented as app-owned bindings, not shared primitive behavior.
- The contract can support multiple app consumers without forcing the same downstream side effect model.
- Form access-mode and workflow-config contracts are explicit.
- The current BASE rebuild consumes `public` and `authenticated_member` entry modes only.

## API / Contract

- Workflow type contract.
- Access-mode contract.
- Form definition contract.
- Field key and field metadata contract.
- Submission payload contract.
- Response capture contract.
- App/workflow binding contract.
- Shared forms authoring contract.

## Visual specification

Not applicable. This slice defines a shared platform contract, not a user-facing route. Any illustrative UI concepts must remain subordinate to the contract and must not hard-code BASE workflow behavior into the shared layer.

## Verification

- A typed workflow can be described without table/column coupling.
- A workflow-specific form can be linked to an app-owned contract without generic table writes.
- Response capture preserves what the user answered and what workflow handled it.
- Shared contracts remain reusable across apps and do not require BASE-specific logic in the core form primitives.

## Testing requirements

- Happy path: a workflow definition can be authored, rendered, and submitted through the shared contract without direct client-side table writes.
- Validation failure: invalid workflow metadata, field keys, or payload shapes are rejected before persistence.
- Auth/permission failure: an unauthorised author or submitter cannot access the relevant shared contract path or mutate the form definition.
- Add contract tests for field-key stability, workflow typing, and response capture semantics.

## Open questions

None currently.

## Do not

- Do not preserve generic client-side multi-table writes as the shared default.
- Do not let `table_name` and `column_name` remain the primary semantic identity.
- Do not push BASE registration or approval semantics into `pace-core2`.
- Do not make every workflow field require a direct DB table/column target.
- Do not preserve `core_form_context_types` or `core_form_field_config` in the rebuild-facing schema contract.
- Do not describe `base_registration_form` or `base_registration_form_type` as the approved registration binding model.

## References

- [`../project-brief.md`](../project-brief.md)
- [`../architecture.md`](../architecture.md)
- [`../../ARC-CORE-forms-platform-rescope.md`](../../ARC-CORE-forms-platform-rescope.md)
- [`../../../../packages/core/docs/requirements/CR23-workflow-forms-runtime.md`](../../../../packages/core/docs/requirements/CR23-workflow-forms-runtime.md)
