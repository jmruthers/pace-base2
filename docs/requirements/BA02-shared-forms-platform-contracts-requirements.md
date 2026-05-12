# BA02 — Shared Forms Platform Contracts

## 1. Slice metadata

- Status: Draft
- Depends on: None
- Backend impact: Schema contracts verification only — all required schema changes are already applied to dev-db. No DDL migrations are in scope for this execution.
- Frontend impact: Non-UI (contracts slice — no routes, no components)

## 2. Overview

BA02 defines the shared typed forms platform contract that every form-driven slice in BASE depends on. It specifies the complete `core_forms` cluster data model — including workflow typing, field semantic identity, submission response capture, and the BASE registration binding model — along with the shared authoring contract exports available from `@solvera/pace-core/forms`. This slice owns no routes and produces no user interface. Its purpose is to establish the authoritative data and contract surface that BA03, BA04, BA05a, BA10, and any other form-consuming slice can safely build against. The executing agent verifies the schema and CR21 export contracts, documents any gaps as blockers, and confirms readiness for dependent slices.

---

## 3. What this slice delivers

### Purpose

BA02 establishes the shared typed forms platform as a verified, stable foundation for all form-driven workflows in BASE. It does so by confirming that the required database schema is applied and correct, that the canonical CR21 authoring exports are available in `@solvera/pace-core/forms`, and that every contract boundary is explicitly documented for downstream slice authors and build agents.

### Surfaces

None. BA02 is a route-less contracts slice. There are no pages, panels, modals, or interactive surfaces owned here.

### Boundaries

BA02 does **not** own:
- The forms authoring UI at `/forms` and `/form-builder` — that is BA03.
- The registration type CRUD, eligibility rules, or the physical DDL creation of `base_form_registration_type` constraints beyond what is already in dev-db — that is BA04.
- Participant-facing form rendering or submission flows — that is BA05a (registration), BA10 (activity booking), and pace-portal.
- Activity booking form contracts (`activity_booking` workflow type) — that is BA09/BA10.
- Any cross-app form consumer outside BASE (TEAM, MEDI, CAKE).
- RLS policy authoring for the `core_forms` cluster — that is the backend/database track authority.
- The `core_field_list` field catalogue (used by the reporting engine in CR22) — explicitly outside this slice.

### Architectural posture

- Import policy is root-first for consuming apps: use `@solvera/pace-core` as the default import surface. Scoped entrypoints (for example `@solvera/pace-core/forms`, `/rbac`, `/hooks`, `/types`) are exception-only and used only when the root export does not expose the required symbol or a documented advanced/performance/migration case requires the scoped path.
- All reads and writes to `core_forms`, `core_form_fields`, `core_form_responses`, and `core_form_response_values` in consuming slices go through the secure Supabase boundary (`useSecureSupabase()` from `@solvera/pace-core/rbac`). No direct unscoped client queries against these tables.
- Workflow form submissions in BASE never write domain tables directly. Submission creates `core_form_responses` and `core_form_response_values` keyed by `field_key`, then calls the appropriate workflow orchestrator (e.g. `app_base_application_create(...)` for registration). The orchestrator sets `workflow_subject_type` and `workflow_subject_id` on the response after creating the domain record.
- `field_key` is the exclusive semantic field identifier across authoring, rendering, submission payloads, and response capture. `table_name`/`column_name` are not valid field semantics anywhere in the rebuild.
- Shared authoring contracts from `@solvera/pace-core/forms` are the only permitted form-builder primitives for BASE. BASE-local form builder clones, local form state hooks, or local field registry implementations are architectural violations.
- BA02 defines the contract; downstream slices implement it. If a downstream slice discovers a discrepancy between this document and dev-db, that discrepancy must be raised as a blocker — not silently worked around.

---

## 4. Functional specification (contract inventory)

> BA02 is a contracts verification slice. The items below describe what the executing agent must confirm is true and available before marking this slice Backend Ready. Each item is independently verifiable.

### 4.1 Workflow type taxonomy contract

1. **C-01** — The shared workflow taxonomy comprises exactly seven types: `base_registration`, `org_signup`, `information_collection`, `activity_booking`, `merch_order`, `consent_capture`, and `generic`. These are the only values valid in `core_forms.workflow_type`.
2. **C-02** — Any workflow form authoring state with a `workflow_type` value outside this taxonomy is rejected by `validateWorkflowAuthoringState` before activation. (Verified via the pace-core2 source — see §6.1.)
3. **C-03** — BASE-authored workflows in this rebuild use: `base_registration`, `information_collection`, `activity_booking`, `merch_order`, `consent_capture`, and `generic`. The `org_signup` type is present in the shared package but is TEAM-owned; BASE does not author `org_signup` forms.
4. **C-04** — Access mode values for all BASE-scoped forms in this rebuild are `public` and `authenticated_member` only. No other `access_mode` value is valid in BASE forms.

### 4.2 `core_forms` schema contract

5. **C-05** — `core_forms` contains the following columns (verified against dev-db `rkytnffgmwnnmewevqgp`):
   - `id` (uuid, PK, `gen_random_uuid()`)
   - `name` (text, NOT NULL) — internal operator label; shown in the admin/authoring UI
   - `title` (text, nullable) — participant-facing display label; shown at the top of the form page when a member fills in the form
   - `description` (text, nullable)
   - `slug` (text, NOT NULL) — unique within scope (see §6.2 slug rules)
   - `workflow_type` (text, NOT NULL) — one of the seven approved taxonomy values per §6.1
   - `owner_app_id` (uuid, nullable) — FK to `rbac_apps`; identifies the owning app
   - `access_mode` (text, NOT NULL, default `'authenticated_member'`) — `'public'` or `'authenticated_member'`
   - `workflow_config` (jsonb, NOT NULL, default `'{}'`) — per-workflow configuration; see §6.6
   - `is_primary_entrypoint` (boolean, NOT NULL, default `false`) — whether this form is the canonical participant entry for its workflow/scope
   - `is_required` (boolean, NOT NULL, default `false`) — whether this form is mandatory for its target audience
   - `is_active` (boolean, nullable, default `true`) — live availability switch
   - `status` (enum `form_status`: `draft` | `published` | `closed`, NOT NULL, default `'draft'`)
   - `event_id` (uuid, nullable) — FK to `core_events`; set for event-scoped workflows
   - `organisation_id` (uuid, NOT NULL) — FK to `core_organisations`; set for all forms
   - `sort_order` (integer, nullable, default `0`)
   - `max_submissions` (integer, nullable) — optional cap on total responses accepted
   - `confirmation_message` (text, nullable) — optional post-submit message displayed to the submitter
   - `opens_at` (timestamptz, nullable) — form becomes available at this UTC timestamp
   - `closes_at` (timestamptz, nullable) — form becomes unavailable after this UTC timestamp
   - `created_at`, `updated_at` (timestamptz), `created_by`, `updated_by` (uuid, nullable)
6. **C-06** — The following columns are **absent** from `core_forms` in the rebuild schema: `context_id`, `require_member_profile_confirmation`, `require_medical_profile_confirmation`, `require_additional_contacts_confirmation`. No rebuild dependency on any of these is permitted.

### 4.3 `core_form_fields` schema contract

7. **C-07** — `core_form_fields` contains the following columns:
   - `id` (uuid, PK)
   - `form_id` (uuid, NOT NULL) — FK to `core_forms`
   - `field_key` (text, NOT NULL) — stable semantic identifier; unique per `form_id` (see §6.3)
   - `field_label` (text, nullable) — display label for the field
   - `field_description` (text, nullable) — helper text
   - `is_required` (boolean, nullable) — whether this field must be answered
   - `is_active` (boolean, nullable) — whether this field is included in the current form
   - `sort_order` (integer, NOT NULL) — render order
   - `validation_rules` (jsonb, nullable) — field-level validation configuration
   - `display_options` (jsonb, nullable) — visibility rules and rendering hints; see §6.4
   - `organisation_id` (uuid, NOT NULL)
   - `created_at`, `updated_at`, `created_by`, `updated_by`
8. **C-08** — The columns `table_name` and `column_name` are **absent** from `core_form_fields`. No rebuild dependency on table/column-oriented field identity is permitted.

### 4.4 `core_form_responses` schema contract

9. **C-09** — `core_form_responses` contains the following columns:
   - `id` (uuid, PK)
   - `form_id` (uuid, NOT NULL) — FK to `core_forms`
   - `respondent_id` (uuid, nullable) — the authenticated user who submitted
   - `workflow_subject_type` (text, nullable) — type of the domain record created by the workflow orchestrator (e.g. `'base_application'`)
   - `workflow_subject_id` (uuid, nullable) — ID of the domain record created by the workflow orchestrator; set after orchestrator runs
   - `submitted_at` (timestamptz, nullable)
   - `status` (text, nullable) — response lifecycle status
   - `metadata` (jsonb, nullable) — workflow-specific submission context
   - `organisation_id` (uuid, NOT NULL)
   - `created_at`, `updated_at`, `created_by`, `updated_by`
10. **C-10** — The columns `target_table` and `target_record_id` are **absent** from `core_form_responses`. No rebuild dependency on generic polymorphic targeting is permitted.

### 4.5 `core_form_response_values` schema contract

11. **C-11** — `core_form_response_values` contains the following columns:
    - `id` (uuid, PK)
    - `response_id` (uuid, NOT NULL) — FK to `core_form_responses`
    - `form_field_id` (uuid, NOT NULL) — FK to `core_form_fields`
    - `field_key` (text, NOT NULL) — stable semantic identifier matching `core_form_fields.field_key`
    - `value_text` (text, nullable) — string field value
    - `value_json` (jsonb, nullable) — structured field value (e.g. address, multi-select)
    - `organisation_id` (uuid, NOT NULL)
    - `created_at`, `updated_at`, `created_by`, `updated_by`
12. **C-12** — The columns `table_name` and `column_name` are **absent** from `core_form_response_values`.

### 4.6 Dropped tables

13. **C-13** — `core_form_context_types` does not exist in the rebuild schema. No rebuild code may reference or query this table.
14. **C-14** — `core_form_field_config` does not exist in the rebuild schema. No rebuild code may reference or query this table.

### 4.7 `base_form_registration_type` contract

15. **C-15** — `base_form_registration_type` exists and contains the following columns:
    - `id` (uuid, PK, `gen_random_uuid()`)
    - `form_id` (uuid, NOT NULL) — FK to `core_forms` where `workflow_type = 'base_registration'`
    - `registration_type_id` (uuid, NOT NULL) — FK to `base_registration_type` (BA04 domain)
    - `event_id` (uuid, NOT NULL) — denormalised for RLS; matches `core_forms.event_id`
    - `organisation_id` (uuid, NOT NULL) — denormalised for RLS
    - `sort_order` (integer, NOT NULL, default `0`) — display order of the registration type when the form is an open-selection entrypoint
    - `is_default` (boolean, NOT NULL, default `false`) — whether this binding is the default selection on an open-selection form
    - `created_at`, `updated_at` (timestamptz, NOT NULL), `created_by`, `updated_by` (uuid, nullable)
16. **C-16** — Each `(form_id, registration_type_id)` pair is unique in `base_form_registration_type` (per CR21 invariant; verify constraint exists in dev-db).
17. **C-17** — A `base_registration` form with exactly one `base_form_registration_type` binding is a **fixed-type** entrypoint: the registration type is committed implicitly when the participant opens the form. A form with two or more bindings is an **open-selection** entrypoint: the participant chooses among eligible types before submitting.
18. **C-18** — At most one `base_form_registration_type` row per form may have `is_default = true`.

### 4.8 Shared authoring exports from `@solvera/pace-core/forms`

19. **C-19** — `WorkflowFormAuthoringShell` is exported from `@solvera/pace-core/forms`. (See §9.2 for full API.)
20. **C-20** — `WorkflowFormMetadataEditor` is exported from `@solvera/pace-core/forms`. (See §9.2.)
21. **C-21** — `WorkflowFormFieldEditor` is exported from `@solvera/pace-core/forms`. (See §9.2.)
22. **C-22** — `validateWorkflowAuthoringState` is exported from `@solvera/pace-core/forms`. (See §9.2.)
23. **C-23** — `buildWorkflowPreviewTarget` is exported from `@solvera/pace-core/forms`. (See §9.2.)

### 4.9 BASE registration binding model

24. **C-24** — `core_forms.workflow_type = 'base_registration'` is the identifier for a BASE registration entrypoint form.
25. **C-25** — `core_forms.slug` is the participant URL identifier for a registration entrypoint within its event scope.
26. **C-26** — `base_form_registration_type` is the approved model for binding a `base_registration` form to permitted `base_registration_type` rows. The superseded models `base_registration_form` and `base_registration_form_type` must not be used anywhere in the rebuild.
27. **C-27** — A single `base_registration` form may be designated as the primary entrypoint (`is_primary_entrypoint = true`) for canonical portal routing at `/{eventSlug}/application`. At most one active primary registration form per event is permitted (enforced by unique partial index in dev-db).

---

## 5. Visual specification

Not applicable. BA02 is a contracts slice with no UI surface.

## 6. Business rules

### 6.1 Workflow type taxonomy rule

**Rule:** `core_forms.workflow_type` must be one of exactly seven values.

| Value | Exclusive owner | Typical scope key |
|-------|-----------------|-------------------|
| `base_registration` | BASE only | `event_id` |
| `org_signup` | TEAM only | `organisation_id` |
| `activity_booking` | Cross-app | `event_id` |
| `merch_order` | Cross-app | `event_id` |
| `information_collection` | Cross-app | `event_id` or `organisation_id` |
| `consent_capture` | Cross-app | `event_id` or `organisation_id` |
| `generic` | Cross-app | `event_id` or `organisation_id` |

- **BASE-exclusive:** `base_registration` is authored only by BASE. No other app authors `base_registration` forms.
- **TEAM-exclusive:** `org_signup` is authored only by TEAM. BASE must never author `org_signup` forms. BASE authoring UI (BA03) must not offer `org_signup` as a selectable workflow type.
- **Cross-app:** `activity_booking`, `merch_order`, `information_collection`, `consent_capture`, and `generic` have no single owning app and may be authored by BASE, TEAM, or any app that depends on `@solvera/pace-core/forms`.
- Any value not in this table is rejected by `validateWorkflowAuthoringState` before a form can be activated.
- `org_signup` forms may exist in the shared `core_forms` table and must not be broken by any BASE migration or query that does not explicitly scope to `owner_app_id` or `event_id`.

### 6.2 Slug uniqueness rules

**Rule:** `core_forms.slug` is unique within its workflow scope.

| Workflow scope | Unique constraint scope |
|----------------|------------------------|
| Event-scoped (`event_id` is set) | `(event_id, slug)` |
| Org-scoped (`event_id` is null) | `(organisation_id, slug)` |

- Slug format: lowercase letters, digits, and hyphens only; must match `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`.
- Invalid slug format is a validation error in `validateWorkflowAuthoringState` and blocks form activation.

### 6.3 `field_key` semantics

**Rule:** `field_key` is the stable semantic field identifier used across authoring, rendering, submission payloads, and response value capture.

- Format convention: `{domain}.{concept}` — for example `person.first_name`, `application.emergency_contact_name`, `consent.event_terms`.
- The `generic.*` namespace is for workflow-specific prompts that do not map to a named domain column; the workflow orchestrator decides how to handle them.
- `field_key` must be unique per form (across all active fields). Duplicate keys within a single form's active fields are rejected by `validateWorkflowAuthoringState`.
- Empty `field_key` values are rejected.
- **Permanence rule:** A `field_key` is permanently bound to its field concept for the lifetime of the form. Once a `field_key` has been used on a field — even if that field is subsequently deactivated — the key must never be reassigned to a semantically different field on the same form. Reuse would cause historical `core_form_response_values` rows with that key to be ambiguously attributed to two different field concepts, breaking reporting and downstream orchestrators.
- `table_name`/`column_name` are not valid field semantic identifiers anywhere in the rebuild. Consuming slices must never author, query, or submit using table/column field identity.

### 6.4 Conditional field visibility
**Rule:** `core_form_fields.display_options` may contain a `visibility` key whose value is a `WorkflowVisibilityRule`.

- Conditional visibility governs only show/hide of supplementary fields within a single form render.
- Conditional visibility must **not** determine which registration type applies, which approval chain is used, what consent is required, or what cost applies. Those are workflow-orchestrator concerns resolved outside the renderer.
- Hidden fields are excluded from the submission payload. The utility `buildWorkflowSubmissionPayload` (see §9.2) accepts a `WorkflowVisibilityContext` and internally calls `filterVisibleWorkflowFields` to exclude hidden fields before building the `values` array.
- The renderer evaluates visibility rules using `WorkflowVisibilityContext` — current in-form values keyed by `field_key`, and the selected registration type ID. Both come from renderer state; neither requires a server round-trip.
- Visibility rule evaluation logic is in `evaluateWorkflowVisibility` / `filterVisibleWorkflowFields` / `isWorkflowFieldVisible`, all exported from `@solvera/pace-core/forms`. See §9.2 for `WorkflowVisibilityRule` and `WorkflowVisibilityCondition` shapes.

### 6.5 `is_primary_entrypoint` constraint

**Rule:** `core_forms.is_primary_entrypoint = true` is only valid for `base_registration` and `org_signup` workflow types.

- Setting `is_primary_entrypoint = true` on any other workflow type is a `validateWorkflowAuthoringState` error and blocks activation.
- At most one active primary registration form per event (`workflow_type = 'base_registration'`, `is_primary_entrypoint = true`, `is_active = true`) is permitted.
- At most one active primary org signup form per organisation (`workflow_type = 'org_signup'`, `is_primary_entrypoint = true`, `is_active = true`) is permitted.

### 6.6 `workflow_config` structure

**Rule:** `workflow_config` is a jsonb object on `core_forms`. Recognised shared keys:

| Key | Type | Purpose |
|-----|------|---------|
| `returnUrl` | string (optional) | Post-submit redirect URL; if omitted, the workflow orchestrator or portal applies its default |
| `preSubmissionChecks` | `WorkflowPreSubmissionCheck[]` (optional) | Acknowledgement gates shown before form fields render |

`WorkflowPreSubmissionCheck` is either:
- A plain string key (e.g. `'member_profile'`)
- An object: `{ key: string; label: string; description?: string }`

Validation rules for `preSubmissionChecks`:
- Each item must be a non-empty string key or an object with non-empty `key` and `label`.
- Empty string keys and empty labels are validation errors.
- The array itself must be an array if present.

Other workflow types define their own recognised keys; unknown keys are ignored by orchestrators that do not recognise them.

### 6.7 Form activation rules

**Rule:** A form cannot be activated (`is_active = true`) until `validateWorkflowAuthoringState` returns `isValid: true`.

Conditions that block activation:
- `name` is empty
- `slug` fails format validation
- `access_mode` is not `public` or `authenticated_member`
- `org_signup` workflow type with `access_mode !== 'authenticated_member'` or missing `organisationId`
- `is_primary_entrypoint = true` on a workflow type other than `base_registration` or `org_signup`
- Zero active fields
- Duplicate or empty `field_key` among active fields
- Invalid `preSubmissionChecks` structure

Conditions that produce warnings (do not block activation):
- `base_registration` form without an `eventId`
- Unknown field type (not `text`, `textarea`, or `address`)

### 6.8 Time-window enforcement

**Rule:** Every point in the BASE system that loads or accepts a form for filling must enforce the `opens_at` and `closes_at` time-window contract.

| `opens_at` state | `closes_at` state | `WorkflowEntrypointState` |
|-----------------|------------------|--------------------------|
| null | null | `ready` (subject to other checks) |
| In the future | — | `not_yet_open` |
| In the past or null | In the past | `closed` |
| In the past or null | In the future or null | `ready` (subject to other checks) |

- All comparisons use the current UTC timestamp.
- A form with `is_active = false` resolves to `not_found` — treat it as absent regardless of time window.
- When both `opens_at` is set and `closes_at` is set, `opens_at` must be earlier than `closes_at`. Authoring UI (BA03) must validate this ordering; malformed rows resolve to `closed` at runtime.
- Time-window enforcement occurs within the broader entrypoint state resolution sequence defined in §6.12. `not_yet_open` and `closed` take priority over `auth_required`, `access_denied`, `no_eligible_types`, and `submitted`.
- Re-validation of the time window must occur server-side at submission time; client-side enforcement is UX only.

### 6.9 `name` vs `title` field semantics

**Rule:**

| Column | Audience | When shown |
|--------|----------|-----------|
| `core_forms.name` | Operator | Admin and authoring surfaces (form list, form builder, reports) |
| `core_forms.title` | Participant | The top of the form page when a member fills in the form; replaces `name` in member-facing render contexts |

- `title` may be null. When null, participant-facing renderers fall back to `name`.
- Authoring surfaces always use `name`; `title` is an optional participant-friendly override.

### 6.10 Submission contract

**Rule:** Form submission in BASE never writes domain tables directly from the client.

Submission sequence:
1. Client validates form availability: `is_active`, time window, `access_mode`, workflow-specific audience/eligibility.
2. Client renders and gates pre-submission check acknowledgements (from `workflow_config.preSubmissionChecks`). Submission CTA is disabled until required acknowledgements are satisfied.
3. Submission goes to a backend boundary (Edge Function or RPC with appropriate privileges):
   a. Re-validates form availability, access mode, and eligibility server-side.
   b. Inserts `core_form_responses` and `core_form_response_values` keyed by `field_key`.
   c. Calls the owning workflow orchestrator with validated context and `p_form_response_id`.
   d. The orchestrator creates the domain record (e.g. `base_application` via `app_base_application_create(...)`).
   e. The orchestrator sets `workflow_subject_type` and `workflow_subject_id` on the `core_form_responses` row.
4. Client redirects per `workflow_config.returnUrl` or the workflow's default post-submit route.

**Atomicity:** Steps 3a through 3e run within a single database transaction. If any step fails — including a failure or exception from the workflow orchestrator call — all inserts from that sequence are rolled back. No orphaned `core_form_responses` rows are created. The client receives a generic submission failure response and may retry the full sequence.

Client code must never: write to `base_application`, `core_person`, or any other domain table directly as part of form submission.

### 6.11 BASE registration fixed-type vs open-selection rule

| `base_form_registration_type` rows bound to form | Entrypoint type | Participant experience |
|--------------------------------------------------|-----------------|----------------------|
| Exactly 1 | Fixed-type | No registration type selector shown; type is committed implicitly |
| 2 or more | Open-selection | Registration type selector rendered before form fields; participant selects one |

- The selected `registration_type_id` is carried explicitly in the submission payload and validated server-side by the orchestrator.
- `is_default = true` on a binding marks the pre-selected option in the selector for open-selection forms.
- At most one binding per form may have `is_default = true`.

### 6.12 Form entrypoint state resolution

**Rule:** All participant-facing form entry points resolve to a `WorkflowEntrypointState` value. The resolution sequence is evaluated in strict order; the first matching condition wins.

| Step | Condition | `WorkflowEntrypointState` |
|------|-----------|--------------------------|
| 1 | Data fetch in progress | `loading` |
| 2 | Form not found for slug, or `is_active = false`, or `status ≠ 'published'` | `not_found` |
| 3 | `opens_at` is in the future | `not_yet_open` |
| 4 | `closes_at` is in the past | `closed` |
| 5 | `access_mode = 'authenticated_member'` and user is not authenticated | `auth_required` |
| 6 | User is authenticated but fails additional access control (e.g. membership check fails, organisation membership required) | `access_denied` |
| 7 | `workflow_type = 'base_registration'` and participant has no eligible registration types | `no_eligible_types` |
| 8 | Participant has already submitted this form (response row exists for `respondent_id`) | `submitted` |
| 9 | All checks pass | `ready` |

**Semantics per state:**

| State | What the participant sees | Participant can submit? |
|-------|--------------------------|------------------------|
| `loading` | Skeleton / loading indicator | No |
| `not_found` | "Form not found" or equivalent | No |
| `not_yet_open` | "This form is not yet open" with optional opening date | No |
| `closed` | "This form is closed" with optional closing date | No |
| `auth_required` | Sign-in prompt | No — must authenticate first |
| `access_denied` | "You do not have access to this form" | No |
| `no_eligible_types` | "There are no registration options available to you" | No |
| `submitted` | "You have already submitted this form" with option to view response | No — already done |
| `ready` | Full form render with fields | Yes |

- Consuming slices (BA05a, BA10) own the UI for each state; BA02 defines the state taxonomy and resolution order only.
- The type `WorkflowEntrypointState` is exported from `@solvera/pace-core/forms` as a string union of all nine values; see §9.2.
- Steps 6 (`access_denied`) and 7 (`no_eligible_types`) may require server-side checks beyond what the form definition alone provides. The consuming slice is responsible for triggering these checks before resolving to `ready`.

---

## 7. API / Contract

### 7.1 Read contracts

**Form definition read (consuming slices)**

Consuming slices load a form definition by querying `core_forms` joined to `core_form_fields`. The DB query returns more columns than `WorkflowFormDefinition` covers. Consuming slices must read the full set and split it into two concerns:

1. **`WorkflowFormDefinition`** — the renderer/submission contract from `@solvera/pace-core/forms`. Pass this to `WorkflowFormRenderer`, `buildWorkflowSubmissionPayload`, and visibility utilities.
2. **Availability and display fields** — columns present in the DB but absent from `WorkflowFormDefinition`: `isActive`, `isPrimaryEntrypoint`, `isRequired`, and `title`. Handle these separately for entrypoint state resolution (§6.12), portal routing, mandatory-form enforcement, and participant display.

The complete DB read shape — call it `WorkflowFormRecord` in the consuming app — is:

```ts
// Define locally in the consuming app; not exported from @solvera/pace-core/forms
interface WorkflowFormRecord extends WorkflowFormDefinition {
  isActive: boolean;           // availability switch; false → resolve to not_found (§6.12)
  isPrimaryEntrypoint: boolean; // portal routing flag (§6.5)
  isRequired: boolean;          // mandatory-form enforcement flag
  title: string | null;         // participant-facing display label; fall back to name when null (§6.9)
}
```

Consuming slices pass `WorkflowFormRecord` (cast as `WorkflowFormDefinition`) to the renderer and handle the four extra fields in their entrypoint state resolution logic.

**Registration bindings read (BASE registration forms only)**

For `workflow_type = 'base_registration'` forms, consuming slices additionally query `base_form_registration_type` to produce `registrationBindings: WorkflowRegistrationBinding[]`. These are merged into the `WorkflowFormRecord.registrationBindings` field before passing to the renderer.

### 7.2 Write contracts

**Form authoring persistence**

Form create and update writes target `core_forms` and `core_form_fields` through the secure Supabase boundary. The authoring state is shaped by `WorkflowAuthoringState` and validated by `validateWorkflowAuthoringState` before any write is attempted.

**Response capture**

All form response writes go through the backend submission boundary. The client submits a `WorkflowSubmissionPayload` (see §9.2); the backend boundary:
- Inserts a `core_form_responses` row.
- Inserts `core_form_response_values` rows, one per visible field, using `field_key` as the identifier.
- Calls the workflow orchestrator.
- Updates `workflow_subject_type`/`workflow_subject_id` on the response row after the orchestrator creates the domain record.

### 7.3 Cross-slice handoffs

| Downstream slice | What BA02 hands it |
|-----------------|-------------------|
| BA03 — Forms authoring | `core_forms` schema contract; CR21 authoring exports; `field_key` identity rules; `validateWorkflowAuthoringState`; `buildWorkflowPreviewTarget` |
| BA04 — Registration setup | `base_form_registration_type` contract shape; fixed-type vs open-selection rule; `is_primary_entrypoint` semantics |
| BA05a — Registration submission | `WorkflowSubmissionPayload` shape; response capture contract; `app_base_application_create(...)` as the workflow orchestrator boundary; `workflow_subject_type`/`workflow_subject_id` linking |
| BA10 — Activity booking | `WorkflowSubmissionPayload` shape for `activity_booking` workflow type; response capture contract |

### 7.4 ID contracts

Typed IDs used at contract boundaries (from `@solvera/pace-core/types`):
- Form IDs and field IDs are treated as opaque UUIDs at the BA02 contract level.
- `field_key` is a plain string semantic identifier — not a typed branded ID.

---

## 8. Data and schema references

### Tables

| Table | Role in BA02 |
|-------|-------------|
| `core_forms` | Primary form definition table; BA02 defines its full column contract |
| `core_form_fields` | Field definitions per form; BA02 defines its column contract (field_key-first) |
| `core_form_responses` | Response capture; BA02 defines its column contract (workflow_subject-based) |
| `core_form_response_values` | Per-field response values; BA02 defines its column contract (field_key-based) |
| `base_form_registration_type` | BASE registration binding; BA02 defines its contract shape |

### MCP verification steps (dev-db `rkytnffgmwnnmewevqgp`)

Run these queries to confirm schema readiness before marking BA02 Backend Ready:

1. **Confirm tables exist and dropped tables are absent:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'core_forms', 'core_form_fields', 'core_form_responses',
  'core_form_response_values', 'base_form_registration_type',
  'core_form_context_types', 'core_form_field_config'
)
ORDER BY table_name;
-- Expected: only the first 5 rows present; core_form_context_types and core_form_field_config absent
```

2. **Confirm `core_forms` new columns present:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'core_forms'
AND column_name IN ('workflow_type','owner_app_id','access_mode','workflow_config','is_primary_entrypoint','title')
ORDER BY column_name;
-- Expected: 6 rows
```

3. **Confirm `core_forms` legacy columns absent:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'core_forms'
AND column_name IN ('context_id','require_member_profile_confirmation',
  'require_medical_profile_confirmation','require_additional_contacts_confirmation');
-- Expected: 0 rows
```

4. **Confirm `core_form_fields.field_key` present; `table_name`/`column_name` absent:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'core_form_fields'
AND column_name IN ('field_key','table_name','column_name');
-- Expected: only 'field_key'
```

5. **Confirm `core_form_responses` uses workflow subject columns:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'core_form_responses'
AND column_name IN ('workflow_subject_type','workflow_subject_id','target_table','target_record_id');
-- Expected: only 'workflow_subject_type' and 'workflow_subject_id'
```

6. **Confirm `core_form_response_values.field_key` present; `table_name`/`column_name` absent:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'core_form_response_values'
AND column_name IN ('field_key','table_name','column_name');
-- Expected: only 'field_key'
```

7. **Confirm `base_form_registration_type` shape:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'base_form_registration_type'
ORDER BY ordinal_position;
-- Expected: id, form_id, registration_type_id, event_id, organisation_id, sort_order, is_default, created_at, updated_at, created_by, updated_by
```

8. **Confirm unique constraint on `base_form_registration_type(form_id, registration_type_id)`:**
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'base_form_registration_type'::regclass
AND contype = 'u';
-- Expected: at least one unique constraint covering (form_id, registration_type_id)
```

9. **Confirm `is_primary_entrypoint` partial unique index on `core_forms`:**
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'core_forms'
AND indexdef ILIKE '%is_primary_entrypoint%';
-- Expected: at least one partial unique index that enforces at-most-one active primary
-- form per event/org (e.g. unique on (event_id) WHERE is_primary_entrypoint = true AND is_active = true)
-- If absent, raise as a blocker — the at-most-one constraint in C-27 is not enforced by the DB
```

### Domain reference docs

- `docs/database/domains/base.md` — authoritative dev-db shape for BASE tables
- `packages/core/docs/requirements/CR21-workflow-forms-runtime.md` — canonical upstream forms platform authority
- `docs/database/decisions/DB-change-decisions-p3.md` — DB-301 DDL traceability

---

## 9. pace-core2 imports

### 9.1 Required symbols actually used in this slice

| Symbol | Import policy | Why used in BA02 |
|---|---|---|
| `WorkflowFormAuthoringShell` | Scoped `/forms` exception path (forms-runtime module surface) | Export readiness verification |
| `WorkflowFormMetadataEditor` | Scoped `/forms` exception path (forms-runtime module surface) | Export readiness verification |
| `WorkflowFormFieldEditor` | Scoped `/forms` exception path (forms-runtime module surface) | Export readiness verification |
| `validateWorkflowAuthoringState` | Scoped `/forms` exception path (forms-runtime module surface) | Contract validation checks |
| `buildWorkflowPreviewTarget` | Scoped `/forms` exception path (forms-runtime module surface) | Preview target contract checks |

### 9.2 Slice-specific caveats only

- BA02 verifies contract readiness; it does not implement UI routes.
- Submission identity is `field_key`-based only.
- Schema/export mismatches are blockers for downstream slices.
- Import style in this slice follows root-first policy; `/forms` references are documented scoped exceptions.

## 10. Permission and access rules

BA02 defines contract shapes; RLS policies are owned by the backend/database track. The following are the expected access boundaries consuming slices must rely on:

| Actor | `core_forms` | `core_form_fields` | `core_form_responses` | `core_form_response_values` | `base_form_registration_type` |
|-------|-------------|-------------------|-----------------------|----------------------------|-------------------------------|
| Event organiser / admin | Read + write (own event scope) | Read + write (own event scope) | Read (own event scope) | Read (own event scope) | Read + write (own event scope) |
| Authenticated participant | Read active forms only (own event scope) | Read active fields only | Write own response | Write own response values | Read (own event scope) |
| Unauthenticated user | Read `public` access-mode forms only | Read active fields of public forms | Write own response (public forms) | Write own response values | Read public form bindings |
| Service role (backend orchestrator) | Full access | Full access | Full access | Full access | Full access |

- No BASE client-side code uses service-role access. Privileged operations (setting `workflow_subject_type`/`workflow_subject_id`, consent creation, application creation) are performed by backend-owned RPCs or Edge Functions under service-role.
- Consuming slices obtain their Supabase client via `useSecureSupabase()` from `@solvera/pace-core/rbac`. They never construct an unscoped client directly.

---

## 11. Acceptance criteria

- [ ] **AC-01 — Workflow taxonomy enforced:** Given a `WorkflowAuthoringState` with `workflowType` set to a value not in the approved taxonomy, when `validateWorkflowAuthoringState` is called, then `result.isValid` is `false` and `result.errors` contains an `invalid_workflow_type` issue.
- [ ] **AC-02 — Field key uniqueness enforced:** Given a `WorkflowAuthoringState` where two active fields share the same `fieldKey`, when `validateWorkflowAuthoringState` is called, then `result.isValid` is `false` and `result.errors` contains a `duplicate_field_key` issue for the second occurrence.
- [ ] **AC-03 — Activation blocked with errors:** Given a `WorkflowAuthoringState` with `isActive = true` and at least one validation error, when `validateWorkflowAuthoringState` is called, then `result.errors` includes an `activation_blocked` issue and `result.isValid` is `false`.
- [ ] **AC-04 — Time window: not yet open:** Given a form where `opens_at` is a future UTC timestamp and `is_active = true`, when the time-window decision table in §6.8 is applied, then the resolved `WorkflowEntrypointState` is `not_yet_open`. Full rendering enforcement is verified in BA05a §11 and BA10 §11.
- [ ] **AC-05 — Time window: closed:** Given a form where `closes_at` is a past UTC timestamp and `is_active = true`, when the time-window decision table in §6.8 is applied, then the resolved `WorkflowEntrypointState` is `closed`. Full rendering enforcement is verified in BA05a §11 and BA10 §11.
- [ ] **AC-06 — Schema verified: `core_forms` new columns present:** Given the dev-db at `rkytnffgmwnnmewevqgp`, when the MCP verification SQL in §8 is run, then `workflow_type`, `owner_app_id`, `access_mode`, `workflow_config`, `is_primary_entrypoint`, and `title` are all present in `core_forms`.
- [ ] **AC-07 — Schema verified: dropped columns absent:** Given the dev-db at `rkytnffgmwnnmewevqgp`, when the MCP verification SQL in §8 is run, then `context_id` and all three `require_*_confirmation` columns are absent from `core_forms`, `table_name`/`column_name` are absent from `core_form_fields` and `core_form_response_values`, and `target_table`/`target_record_id` are absent from `core_form_responses`.
- [ ] **AC-08 — Schema verified: dropped tables absent:** Given the dev-db at `rkytnffgmwnnmewevqgp`, when the MCP verification SQL in §8 is run, then `core_form_context_types` and `core_form_field_config` are absent from the public schema.
- [ ] **AC-09 — CR21 exports available:** Given a TypeScript file that imports `WorkflowFormAuthoringShell`, `WorkflowFormMetadataEditor`, `WorkflowFormFieldEditor`, `validateWorkflowAuthoringState`, and `buildWorkflowPreviewTarget` from `@solvera/pace-core/forms`, when the consuming app's type-checker runs, then all five imports resolve without error.
- [ ] **AC-10 — Submission payload is `field_key`-keyed:** Given a `WorkflowSubmissionPayload` built from a submitted form, then `payload.values` is an array of `{ fieldKey: string; value: unknown }` objects — no `table_name` or `column_name` keys are present anywhere in the payload.
- [ ] **AC-11 — Fixed vs open-selection binding count:** Given a `base_registration` form with exactly one `base_form_registration_type` row in dev-db, when `base_form_registration_type` is queried and mapped, then the resulting `registrationBindings` array has exactly one entry. Given a form with two rows, the array has two entries. (The rendering consequence — whether a type selector is shown — is verified in BA05a §11.)
- [ ] **AC-12 — `org_signup` access mode constraint:** Given a `WorkflowAuthoringState` with `workflowType = 'org_signup'` and `accessMode = 'public'`, when `validateWorkflowAuthoringState` is called, then `result.isValid` is `false` and `result.errors` includes `invalid_workflow_access_combination`.
- [ ] **AC-13 — `is_primary_entrypoint` constraint:** Given a `WorkflowAuthoringState` with `isPrimaryEntrypoint = true` and `workflowType = 'information_collection'`, when `validateWorkflowAuthoringState` is called, then `result.errors` includes `invalid_entrypoint`.
- [ ] **AC-14 — `buildWorkflowPreviewTarget` primary entrypoint path:** Given a state with `workflowType = 'base_registration'`, `isPrimaryEntrypoint = true`, and `options.eventSlug = 'camp-alpha'`, when `buildWorkflowPreviewTarget` is called, then `result.path` is `'/camp-alpha/application'` and `result.reason` is `'base_primary_entrypoint'`.

---

## 12. Verification

- Run schema verification queries for required/new/removed forms contracts.
- Verify unique binding constraint on `base_form_registration_type(form_id, registration_type_id)`.
- Verify partial unique index for `is_primary_entrypoint` on `core_forms`.
- Verify CR21 symbol imports resolve from `@solvera/pace-core/forms`.
- Run contract test suites for validation and preview target functions.

## 13. Testing requirements

- Contract test suites for validation and preview-target utilities must pass.
- Integration assertions verify `field_key`-only submission payload shape.
- Verification SQL checks should remain repeatable for backend-ready evidence.

## 14. Build execution rules

- Verification-only slice: no schema/RPC/RLS/UI implementation work here.
- Stop on any schema/export mismatch and log blocker evidence.
- Do not workaround missing contracts in BA02.

## 15. Done criteria

- All §12 schema/export/test checks pass and are recorded.
- Backend-ready evidence is updated for BA02.
- No open BA02 blockers remain for dependent slices.

## 16. Do not

- Do not implement routes/components in BA02.
- Do not create migrations from this slice.
- Do not reintroduce `table_name`/`column_name` semantics or dropped legacy tables.
- Do not invent missing package exports.

## 17. References

- `docs/requirements/BASE-project-brief.md`
- `docs/requirements/BASE-architecture.md`
- `docs/requirements/BA03-forms-authoring-and-base-integration-requirements.md`
- `docs/requirements/BA04-registration-setup-and-policy-requirements.md`
- `docs/requirements/BA05a-registration-entry-and-application-submission-requirements.md`

## 18. Implementing Agent Instructions

- Execute MCP schema checks, export checks, and contract tests only.
- Record evidence and blockers; do not expand into implementation work.
