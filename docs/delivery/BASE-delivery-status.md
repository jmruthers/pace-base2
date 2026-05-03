# BA00-BA07 Delivery Status (Dev DB: `rkytnffgmwnnmewevqgp`)

Date: 2026-05-03  
Scope: BA00, BA01, BA02, BA03, BA04, BA05a, BA05b, BA06, BA07 requirement slices audited against code + Supabase MCP

## Executive Status

- BA00 App Shell and Access: **COMPLETE**
- BA01 Event Workspace and Configuration: **COMPLETE**
- BA02 Shared Forms Platform Contracts: **COMPLETE**
- BA03 Forms Authoring and BASE Integration: **COMPLETE**
- BA04 Registration Setup and Policy: **COMPLETE**
- BA05a Registration Entry and Application Submission: **COMPLETE**
- BA05b Participant Application Progress: **COMPLETE** (backend contract in audited environment)
- BA06 Applications Admin and Review: **COMPLETE**
- BA07 Token Approval Actions: **COMPLETE** (backend contract in audited environment)

## Environment Evidence

- Supabase MCP data queries succeeded against `rkytnffgmwnnmewevqgp` (`list_tables`, `execute_sql`).
- Targeted tests passed:
  - `src/app.test.tsx` (BA00 routing/restoration): 17/17
  - `src/main.test.tsx` (BA00 bootstrap/inactivity wiring): 2/2
  - `src/components/layout/AuthenticatedShell.test.tsx` (BA00 password/sign-out shell flows): 3/3
  - `src/shared-forms-contracts.test.ts` (BA02): 11/11
  - BA01 suite:
    - `src/features/eventConfiguration/configuration.test.ts` (2/2)
    - `src/features/eventConfiguration/dashboard.test.ts` (4/4)
    - `src/features/eventConfiguration/shared.test.ts` (8/8)
    - `src/pages/eventConfiguration/EventConfigurationRoute.test.tsx` (7/7)
    - `src/pages/eventConfiguration/EventDashboardPage.test.tsx` (3/3)
  - BA06 suite:
    - `src/pages/applications/ApplicationsPage.test.tsx` (9/9)
    - `src/features/applicationsAdmin/stateHelpers.test.ts` (9/9)
  - BA07 contract assertions:
    - `src/features/tokenApprovals/contract.test.ts` (4/4)

## BA00 Status (COMPLETE)

### Confirmed complete

- Bootstrap/provider wiring is implemented in `src/main.tsx`, including `setupRBAC(...)` before render.
- Route composition and root redirect behavior are implemented in `src/App.tsx`.
- Shell/nav wiring is implemented in `src/components/layout/AuthenticatedShell.tsx` and `src/config/baseRouteRegistry.ts`.
- BASE RBAC pages in dev DB include required nav page names:
  - `event-dashboard`, `configuration`, `forms`, `registration-types`, `applications`, `communications`, `units`, `activities`, `scanning`, `reports`.
- BA00 test coverage now includes:
  - Session restoration hold behavior (`Restoring session…`) in `src/app.test.tsx`.
  - Inactivity provider wiring and idle logout navigation in `src/main.test.tsx`.
  - Password change success/error and sign-out-await sequencing in `src/components/layout/AuthenticatedShell.test.tsx`.

## BA01 Status (COMPLETE)

### Confirmed complete

- Dashboard/configuration routes and guards are wired (`src/App.tsx`, page modules).
- BA01 feature data layer uses secure boundary (`useSecureSupabase`) and route/page orchestration is separated:
  - `src/features/eventConfiguration/configuration.ts`
  - `src/features/eventConfiguration/dashboard.ts`
  - `src/features/eventConfiguration/useEventLogoReference.ts`
- Dev DB checks passed for core BA01 table contracts:
  - `core_events` includes expected BA01 columns (including `registration_scope NOT NULL`, `expected_participants`, `typical_unit_size`).
  - `core_forms`, `base_application`, `base_registration_type` all include `event_id`.
  - RLS enabled and policies present for `core_events`, `core_file_references`, and dashboard count tables.
- `event_venue` read-side hydration is fixed in `src/features/eventConfiguration/shared.ts`, with assertions in:
  - `src/features/eventConfiguration/shared.test.ts`
  - `src/pages/eventConfiguration/EventConfigurationRoute.test.tsx` (read-only fallback shows persisted venue).
- File-reference contract alignment is complete (requirements-first):
  - BA01 requirement doc now reflects canonical `core_file_references` columns (no top-level `category`/`folder`).
  - BA01 logo query now scopes by `file_path` convention in `src/features/eventConfiguration/useEventLogoReference.ts`.
  - MCP reconfirmed `core_file_references` column set on dev DB.

## BA02 Status (COMPLETE)

### Confirmed complete against dev DB and code

- BA02 schema verification checks passed on `rkytnffgmwnnmewevqgp`:
  - Required tables present: `core_forms`, `core_form_fields`, `core_form_responses`, `core_form_response_values`, `base_form_registration_type`.
  - Dropped tables absent: `core_form_context_types`, `core_form_field_config`.
  - `core_forms` required columns present: `workflow_type`, `owner_app_id`, `access_mode`, `workflow_config`, `is_primary_entrypoint`, `title`.
  - Legacy `core_forms` columns absent: `context_id`, `require_member_profile_confirmation`, `require_medical_profile_confirmation`, `require_additional_contacts_confirmation`.
  - `core_form_fields` includes only `field_key` from identity set (`table_name`/`column_name` absent).
  - `core_form_responses` includes only `workflow_subject_type`/`workflow_subject_id` from identity set (`target_*` absent).
  - `core_form_response_values` includes only `field_key` from identity set (`table_name`/`column_name` absent).
  - `base_form_registration_type` shape and unique constraint `(form_id, registration_type_id)` present.
  - Primary entrypoint unique index present on `core_forms` for active published `base_registration` forms per event.
- BA02 contract tests pass in `src/shared-forms-contracts.test.ts` (taxonomy, entrypoint constraints, preview target, `fieldKey` payload shape).
- Runtime RPCs required by BA02-consuming paths exist in dev DB:
  - `app_base_form_upsert`
  - `app_base_form_fields_replace`
  - `app_base_application_create`
- Fixed/open-selection evidence exists in live data:
  - One form with 1 binding
  - One form with 2 bindings
  - Exactly one default per form in sampled data

## BA03 Status (COMPLETE)

### Confirmed complete against dev DB and code

- BA03 routes and shell integration are wired in `src/App.tsx` and `src/config/baseRouteRegistry.ts` for `/forms` and `/form-builder`.
- Forms list implementation aligns with BA03 list requirements:
  - `src/pages/forms/FormsListPage.tsx` implements read/create/update guards, no-event/empty/error/loading branches, field count rendering, preview/copy/delete actions, and delete-blocking dialog.
  - `src/features/formsAuthoring/configuration.ts` implements list queries, field count batching, and delete RPC (`app_base_form_delete`) usage through `useSecureSupabase()`.
- Form builder implementation aligns with BA03 authoring flow requirements:
  - `src/pages/forms/FormBuilderPage.tsx` uses `WorkflowFormAuthoringShell` with BASE workflow filters, schedule/submission panels, and registration binding panel visibility for `base_registration`.
  - `src/features/formsAuthoring/configuration.ts` executes ordered save sequence `app_base_form_upsert -> app_base_form_fields_replace -> app_base_form_registration_bindings_replace` and uses secure boundaries.
  - `src/features/formsAuthoring/shared.ts` and `src/features/formsAuthoring/stateHelpers.ts` implement slug derivation, event slug fallback, ISO date conversion, and payload shaping (`max_submissions` / `confirmation_message` extraction).
  - Workflow toggle behavior now rehydrates persisted registration bindings when switching away from and back to `base_registration` in edit mode.
- MCP backend checks passed on `rkytnffgmwnnmewevqgp`:
  - Required BA03 tables and columns exist: `core_forms`, `core_form_fields`, `base_form_registration_type`.
  - Required BA03 RPCs exist with expected signatures: `app_base_form_upsert`, `app_base_form_fields_replace`, `app_base_form_delete`, `app_base_form_registration_bindings_get`, `app_base_form_registration_bindings_replace`.
  - Function bodies confirm expected BA03 semantics:
    - `app_base_form_upsert` writes status/entrypoint/activity/schedule/submission fields.
    - `app_base_form_fields_replace` performs full replace semantics.
    - `app_base_form_delete` blocks when responses or registration bindings exist and returns counts.
    - `app_base_form_registration_bindings_get/replace` provide read/write binding flows with `form-builder` permission checks.
  - RLS policies are present for BA03 tables (`core_forms`, `core_form_fields`, `base_form_registration_type`), and binding persistence now runs through the BA03 RPC boundary.
- Tests covering BA03 paths are present and passing in audited suite:
  - `src/pages/forms/FormsListPage.test.tsx`
  - `src/pages/forms/FormBuilderPage.test.tsx`
  - `src/features/formsAuthoring/configuration.test.tsx`
  - `src/features/formsAuthoring/shared.test.ts`
  - `src/features/formsAuthoring/stateHelpers.test.ts`

## BA04 Status (COMPLETE)

### Confirmed complete against dev DB and code

- BA04 route and page-level guard are implemented at `src/pages/registrationTypes/RegistrationTypesPage.tsx` with `PagePermissionGuard` `pageName="registration-types"`.
- BA04 list surface requirements are implemented:
  - `src/pages/registrationTypes/components/RegistrationTypesHeader.tsx` provides title/subtitle and create action guard.
  - `src/pages/registrationTypes/components/RegistrationTypesContent.tsx` provides no-event/empty/loading/error states, status badges, eligibility count, capacity/cost display, edit/manage/toggle actions with update guards.
- BA04 dialog and requirements workflows are implemented:
  - `src/pages/registrationTypes/components/RegistrationTypeDialog.tsx` supports create/edit modes, type fields, eligibility rule editor, and in-dialog confirmation step for save.
  - `src/pages/registrationTypes/components/RequirementsDialog.tsx` supports fetch loading/error states, sortable requirement ordering (`@dnd-kit`), add/remove/config editing, designated-org validation, and in-dialog confirmation step.
  - `src/pages/registrationTypes/components/RequirementConfigPanel.tsx` renders required informational copy and per-check config controls.
- BA04 controller and payload/snapshot semantics are implemented:
  - `src/pages/registrationTypes/hooks/useRegistrationTypesPageController.ts` maintains type/eligibility/requirements snapshots, active toggle optimistic behavior with rollback, and confirmation step flows.
  - `src/features/registrationSetup/stateHelpers.ts` enforces validation, derives payloads for full-array replace semantics, and derives `is_automated` from check type.
- MCP backend checks passed on `rkytnffgmwnnmewevqgp`:
  - Required BA04 tables/constraints are present: `base_registration_type`, `base_registration_type_eligibility`, `base_registration_type_requirement`.
  - Required BA04 RPCs/signatures are present: `app_base_registration_type_upsert`, `app_base_registration_type_set_active`.
  - Supporting helper function exists: `get_org_descendants`.
  - RPC function bodies confirm expected upsert/replace and set-active behavior with permission checks.
  - RLS policies are present across BA04 tables.
- Tests covering BA04 paths are present and passing in audited suite:
  - `src/pages/registrationTypes/RegistrationTypesPage.test.tsx`
  - `src/pages/registrationTypes/components/RegistrationTypeDialog.test.tsx`
  - `src/pages/registrationTypes/hooks/useRegistrationTypesPageController.test.tsx`

## BA05a Status (COMPLETE)

### Confirmed complete against dev DB and code

- BA05a migration lineage is present on `rkytnffgmwnnmewevqgp`, including:
  - `20260502103500 ba05a_registration_submission_contract_alignment`
  - `20260502105500 ba05a_contract_alignment_pgcrypto_fix`
  - `20260502111000 ba05a_contract_alignment_membership_scope_fix`
  - `20260502112000 ba05a_referee_rpc_ambiguity_fix`
  - `20260503194000 ba05a_backend_gap_closure`
  - `20260503195000 ba05a_chain_notification_progression_fix`
  - `20260503221000 ba05a_eligibility_strict_and_semantics`
- `base_application.referee_person_id` exists and matches required schema contract:
  - Nullable `uuid` column.
  - FK `base_application_referee_person_id_fkey` to `core_person(id)` with `ON DELETE SET NULL`.
  - Index `idx_base_application_referee_person_id`.
- `app_base_application_create` exists with required BA05a contract posture:
  - `SECURITY DEFINER`, `search_path=public`.
  - Signature includes `p_referee_person_id`, `p_consents`, and **does not include** caller-authoritative `p_status`.
  - Inserts `base_application_check` rows as `pending`, activates first tokenised check (`guardian_approval` / `referee`) with 14-day token expiry, and calls `app_base_advance_application_checks(...)`.
  - Persists consent snapshots into `base_consent` from `p_consents`.
- `app_base_eligible_referees_for_applicant` exists with required BA05a posture:
  - `SECURITY DEFINER`, `search_path=public`.
  - Uses `org_ancestors` for ancestor-org candidate resolution, excludes deleted rows and self-reference.
- `app_base_application_check_reissue_token` default expiry is aligned:
  - `p_expiry_interval interval DEFAULT '14 days'::interval`.
- `base_application_check` status constraint is aligned:
  - `CHECK ((status = ANY (ARRAY['pending'::text, 'satisfied'::text, 'failed'::text, 'waived'::text])))`.
- BASE repo call-site alignment for reissue is present in `src/features/applicationsAdmin/configuration.ts` (RPC invoked with `p_check_id` only, relying on backend default interval).
- Eligibility semantics closure verified in `app_base_application_create`:
  - Function now enforces strict FS-06 semantics using `match_count <> rule_count` checks for `membership_type`, `dob_before`, and `dob_after`.
  - Legacy permissive checks (`match_count = 0`) are no longer present for those rule families.
  - Eligibility failure class remains `base_application_eligibility_failed`.

## BA05b Status (COMPLETE - Backend Contract)

### Confirmed complete against dev DB and code

- BA05b migration lineage is present on `rkytnffgmwnnmewevqgp`:
  - `20260502114500 ba05b_participant_progress_rpc`
  - `20260502115500 ba05b_progress_rpc_referee_shape_fix`
- `app_base_application_progress_get(p_application_id uuid)` exists and is callable by `authenticated` role:
  - `SECURITY DEFINER`, `search_path=public`.
  - Signature matches BA05b (`p_application_id` only; no caller-supplied user parameter).
- Function body aligns with BA05b participant-safe contract:
  - Authorises via `auth.uid()` + `base_application_is_applicant(...)`.
  - Returns `application`, `registration_type`, `checks`.
  - Enforces participant label mapping for known `check_type` values.
  - Raises `base_application_access_denied` for unauthenticated / non-applicant / unresolved application cases.
  - Excludes sensitive fields such as `token_hash`, `token_expires_at`, `carer_person_id`, and `referee_person_id` from payload.
- BASE repo includes BA05b contract coverage in `src/ba05b-participant-progress-contracts.test.ts`:
  - Exact key allow-list assertions for top-level and nested objects.
  - Forbidden key exclusion checks.
  - Check status and label mapping assertions.
  - Denial string mapping for `base_application_access_denied`.

### Scope boundary note

- BA05b is backend-only for this BASE audit lane. Participant progress route/UI consumption remains portal-owned and is out of scope for this repository.

## BA06 Status (COMPLETE)

### Confirmed complete against dev DB and code

- BA06 route and shell integration are wired in:
  - `src/App.tsx`
  - `src/config/baseRouteRegistry.ts`
  - `src/pages/applications/ApplicationsPage.tsx`
- BA06 queue, detail dialog, review steps dialog, and action affordances are implemented in `src/pages/applications/ApplicationsPage.tsx`:
  - Queue `DataTable` columns, filter controls, feature flags, no-event/empty/error/loading states.
  - Detail dialog with evidence loading/error/empty handling and checks overview sorted by requirement order.
  - Review steps dialog available only when checks exist.
  - Organiser actions for approve/reject application, event check satisfy/reject, and token reissue.
- BA06 data layer and RPC boundaries are implemented in `src/features/applicationsAdmin/configuration.ts` with `useSecureSupabase()`:
  - Reads: `base_application` queue and application-scoped evidence filtering on `workflow_subject_type = 'base_application'` and `workflow_subject_id = application id`.
  - Writes: `app_base_application_set_status`, `app_base_application_check_set_status`, `app_base_application_check_reissue_token`.
  - Reissue call-site sends only `p_check_id`, relying on backend expiry defaults.
- BA06 helper logic coverage in `src/features/applicationsAdmin/stateHelpers.ts` and tests in `src/features/applicationsAdmin/stateHelpers.test.ts` confirms:
  - Applicant name fallback policy.
  - Submitted-date fallback.
  - Status/check badges and check-summary priority rules.
  - Check sorting by requirement sort order with nulls last.
  - JSON and evidence label rendering rules.
- BA06 page tests in `src/pages/applications/ApplicationsPage.test.tsx` confirm:
  - No-event card path.
  - Review-steps suppression for rows without checks.
  - Queue and evidence retry behavior.
  - Event-approval and reissue action visibility gates.
  - Override button visibility constraints.
  - Concurrency conflict toast path.
  - Reject confirmation flow enforces required notes before mutation.

### MCP backend evidence for BA06

- Required organiser RPCs exist on `rkytnffgmwnnmewevqgp`:
  - `app_base_application_set_status(p_application_id, p_target_status, p_actor, p_notes)`
  - `app_base_application_check_set_status(p_check_id, p_status, p_notes)`
  - `app_base_application_check_reissue_token(p_check_id, p_actor, p_expiry_interval)`
- `app_base_application_set_status` function body invokes `app_base_queue_application_status_notification(...)` non-fatally after status mutation.
- `pump_system_templates` includes active keys:
  - `base.application_approved` (`email`)
  - `base.application_rejected` (`email`)
- RLS is enabled on `base_application`, `base_application_check`, `core_form_responses`, and `core_form_response_values`.

## BA07 Status (COMPLETE - Backend Contract)

### Confirmed complete against dev DB and code

- BA07 is backend-contract scope for BASE (no BASE token route/UI), aligned with `docs/requirements/BA07-token-approval-actions-requirements.md`.
- Dev DB migrations include BA07 contract alignment rollout:
  - `20260503153000 ba07_token_contract_alignment`
  - `20260503205300 ba07_token_contract_runtime_alignment`
- MCP function signatures and bodies are aligned with BA07 contract requirements:
  - `app_base_application_check_resolve_token(p_raw_token text)`:
    - Enforces blank-token rejection.
    - Uses trimmed SHA-256 token digest lookup.
    - Restricts to pending, non-expired checks.
    - Returns allow-listed resolve payload keys only.
    - Serializes `expires_at` in UTC ISO format.
  - `app_base_application_check_submit(p_raw_token text, p_outcome text, p_notes text)`:
    - Validates in required order (token, outcome, reject-notes, lookup).
    - Enforces `approve`/`reject` outcomes and reject-note requirement.
    - Clears token hash/expiry on success.
    - Writes decision-only notes behavior via normalized notes.
    - Calls `app_base_advance_application_checks(...)` in-transaction after update.
    - Returns allow-listed submit payload keys only.
  - `app_base_application_check_reissue_token(p_check_id uuid, p_actor uuid, p_expiry_interval interval)`:
    - Defaults and fallback align to 14 days.
    - Restricts to pending guardian/referee checks with event access checks.
    - Returns `check_id`, `token`, `token_expires_at` with UTC token expiry serialization.
- MCP routine grants align with token-path expectations:
  - `resolve_token` and `submit` executable by `anon`/`PUBLIC` and `authenticated`.
  - `reissue_token` executable by `authenticated` (guarded in-function by access checks).

### BA07 contract assertions added in repo

- Added `src/features/tokenApprovals/contract.ts` to codify BA07 payload allow-lists and canonical token error messages.
- Added `src/features/tokenApprovals/contract.test.ts` to enforce:
  - Exact BA07 error-message contract constants.
  - Exact key allow-list behavior for resolve, submit, and reissue payloads.
  - Rejection of payloads containing extra/unexpected fields.

## MCP Evidence (BA05-BA07)

- Supabase MCP checks executed against `rkytnffgmwnnmewevqgp` using `list_migrations`, `list_tables`, and targeted `execute_sql` function/constraint introspection.
- Contract artifacts inspected directly from dev DB metadata/function bodies:
  - `app_base_application_create`
  - `app_base_eligible_referees_for_applicant`
  - `app_base_application_check_reissue_token`
  - `app_base_application_check_resolve_token`
  - `app_base_application_check_submit`
  - `app_base_application_set_status`
  - `app_base_application_check_set_status`
  - `app_base_queue_application_status_notification`
  - `app_base_application_progress_get`
  - `app_base_advance_application_checks`
  - `base_application_is_applicant`
  - `base_application_check_status_check`
- Execute grants confirmed for `authenticated` on:
  - `app_base_application_create`
  - `app_base_eligible_referees_for_applicant`
  - `app_base_application_progress_get`

## Final Completion Call

- **BA00 is complete** for this audited environment.
- **BA01 is complete** for this audited environment.
- **BA02 is complete** for this audited environment.
- **BA03 is complete** for this audited environment.
- **BA04 is complete** for this audited environment.
- **BA05a is complete** for this audited environment.
- **BA05b is complete (backend contract)** for this audited environment.
- **BA06 is complete** for this audited environment.
- **BA07 is complete (backend contract)** for this audited environment.

## Recommended Next Actions

1. Keep BA03/BA04/BA06 regression tests in CI alongside existing BA00-BA02 coverage.
2. Continue using `rkytnffgmwnnmewevqgp` as the required MCP evidence environment for future slice audits.
3. Keep BA05a/BA05b/BA07 backend RPC parity checks in the delivery audit loop after each pace-core migration rollout.
4. Keep BA05b participant contract tests (`src/ba05b-participant-progress-contracts.test.ts`) and BA07 contract tests (`src/features/tokenApprovals/contract.test.ts`) in CI as guardrails for payload-surface regressions.
