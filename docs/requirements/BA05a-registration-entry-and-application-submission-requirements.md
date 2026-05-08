# BA05a — Registration Entry and Application Submission

## 1. Slice metadata

- Status: Ready for implementation
- Depends on: BA02 (Shared Forms Platform Contracts), BA03 (Forms Authoring and BASE Integration), BA04 (Registration Setup and Policy)
- Backend impact: Schema change(s) and RPC extensions (see §8)
- Frontend impact: Non-UI for BASE — participant-facing UI is pace-portal scope (§5)

## 2. Overview

BA05a is the **BASE registration submission contract slice**. It defines how a captured registration form response becomes a `base_application` row under backend orchestration: registration-scope checks, per-type eligibility, derived initial status, optional carer and referee hand-offs, consent snapshots, approval-chain initialisation, and magic-link defaults. BASE does not own participant-facing pages; this document is the authoritative contract for backend RPCs, data shapes, and pace-core2 renderer boundaries that portal implementations must honour.

---

## 3. What this slice delivers

### 3.1 Contract surfaces

**Purpose.** Freeze the behaviour of registration submission so that no consumer performs direct inserts or updates on `base_application` for creation, and so eligibility, scope, consent, and requirement activation are atomic with application creation.

**Surfaces (BASE).** None. No routes or interactive UI are owned here.

**Surfaces (portal — out of scope for BASE execution).** Participant registration entry, form render, submit affordances, and error mapping — owned by pace-portal slices (cross-references in §5).

### 3.2 Boundaries

BA05a does **not** own:

- Participant-facing UI implementation (pace-portal PR-series slices).
- Admin application review UI — BA06.
- Authoring of forms or registration types — BA03 / BA04.
- Communications templates or send plumbing — BA17 defines keys and utilities; BA05a only specifies **when** orchestration must trigger notifications where applicable.
- Generic writes from form machinery into domain tables — all domain effects go through the orchestrator RPC after response capture per BA02.

### 3.3 Architectural posture

- Import policy is root-first for consuming apps: use `@solvera/pace-core` as the default import surface. Scoped entrypoints (for example `@solvera/pace-core/forms`, `/rbac`, `/hooks`, `/types`) are exception-only and used only when the root export does not expose the required symbol or a documented advanced/performance/migration case requires the scoped path.
- Registration uses `core_forms.workflow_type = 'base_registration'` entrypoints, `base_form_registration_type` bindings, `access_mode`, and `workflow_config` (including `pre_submission_checks`) per BA02 / BA04.
- After `core_form_responses` and `core_form_response_values` exist, **application creation is exclusively** via extended `app_base_application_create` (or a thin adapter that calls it). Consumers never call `event_applicant_org_allowed` directly — it remains internal to the create path.
- Initial `base_application.status` is **always** derived by the backend from requirement rows and orchestration rules — not supplied as caller authority.
- Organisation hierarchy for referee eligibility uses **`org_ancestors` and `get_org_ancestors`** — **`ltree` is not used** on dev-db and must not be introduced for this contract.
- Shared renderer and submission types come from `@solvera/pace-core/forms` (CR21). BASE-local forks of that behaviour are out of scope.

---

## 4. Functional specification

Items use prefix **FS-** (functional submission contract). Each item is independently verifiable.

### 4.1 Entrypoint and capture

- **FS-01** — Registration entrypoints are rows in `core_forms` with `workflow_type = 'base_registration'`, scoped to an event, with slug and availability fields per BA02.
- **FS-02** — Binding between form and allowed registration types is exclusively via `base_form_registration_type`. Single binding implies fixed type; multiple bindings imply participant type selection before submit.
- **FS-03** — Form submission produces a `core_form_responses` row and `core_form_response_values` keyed by `field_key`, per BA02. No `table_name` / `column_name` identity appears in the rebuild path.
- **FS-04** — The orchestrator linking `core_form_responses.workflow_subject_type` / `workflow_subject_id` to the created application is part of the submission adapter contract (BA02 §7.2 pattern); BA05a requires the domain id written there to be the `base_application.id` returned from `app_base_application_create`.

### 4.2 Orchestrated application creation

- **FS-05** — `app_base_application_create` evaluates registration scope using **`event_applicant_org_allowed`** internally (`core_events.registration_scope` + applicant context). Consumers rely on distinct error surfacing from this path versus eligibility failures (§7).
- **FS-06** — Before insert, the RPC evaluates **`base_registration_type_eligibility`** rows for the selected `registration_type_id`. Each row encodes one rule via `rule_type` and `value`. The supported rule types and their evaluation are:
  - `membership_type` — the applicant must have a `core_member` row for `p_organisation_id` where `membership_type_id = value::integer` and `deleted_at IS NULL`.
  - `dob_before` — the applicant's `core_person.date_of_birth` must be strictly before `value::date`.
  - `dob_after` — the applicant's `core_person.date_of_birth` must be strictly after `value::date`.
  - All rules are evaluated with **AND logic**: every row must pass. If any single rule fails, the RPC raises the eligibility failure exception class (§7.4) — **distinct** from scope denial (FS-05).
  - When no `base_registration_type_eligibility` rows exist for the selected type, eligibility evaluation is skipped and the applicant is considered eligible.
- **FS-07** — Initial status is **backend-derived**: if the selected type has **no** rows in `base_registration_type_requirement`, initial status is **`approved`**; if **any** requirement rows exist, initial status is **`under_review`**.
- **FS-08** — When initial status is **`under_review`**, the RPC creates one **`base_application_check`** row per requirement, ordered by `sort_order`. All rows are created with `status = 'pending'`. After inserting all check rows, the RPC fires the first check (lowest `sort_order`) and then calls the internal helper **`app_base_advance_application_checks`** (§7.4) to handle subsequent chain state. Fire semantics per check type, the full satisfaction mechanism table, and chain progression rules are defined in **`docs/requirements/base/BASE-architecture.md` §4 — Check chain state machine**, which is the authoritative cross-slice reference. The BA05a-specific portion is:
  - `guardian_approval` as first check: generate `token_hash` (secure random) + `token_expires_at = now() + interval '14 days'` on the check row; queue `base.guardian_request_issued` (BA17 **SN-01**) via `app_base_queue_check_notification` for downstream dispatch.
  - `referee` as first check: generate `token_hash` + `token_expires_at = now() + interval '14 days'` on the check row; queue `base.referee_request_issued` (BA17 **SN-03**) via `app_base_queue_check_notification` for downstream dispatch.
  - `home_leader_approval`, `designated_org_review`, `event_approval`, `payment` as first check: no action beyond the `pending` row. These are surfaced to the relevant actor via TEAM or BA06 approval surfaces; no token is generated at create time.
  - Subsequent check rows (`sort_order` > first) are created as plain `pending` with null `token_hash` and null `token_expires_at`. They are fired only when their predecessor resolves — handled by `app_base_advance_application_checks`.

- **FS-09** — When initial status is **`approved`**, no `base_application_check` rows are created. Default behaviour is none for requirement-free types.
- **FS-10** — Caller-supplied **`p_status`** is removed or ignored as authority; any legacy caller passing status must be updated — intentional breaking change coordinated via migration PR.

### 4.3 Carer, referee, consent

- **FS-11** — Optional **`p_carer_person_id`** (nullable): when non-null, persisted to **`base_application.carer_person_id`** with validation — must be distinct from applicant `p_person_id` and must resolve to a non-deleted row in `core_person`. Carer is **optional on every registration** and never driven by `base_registration_type_requirement`.
- **FS-12** — When the selected type includes a **`referee`** requirement, the participant flow selects an eligible referee **before** submit. Eligible rows are loaded via **`app_base_eligible_referees_for_applicant`** (§7). The selected person id is supplied to create as **`p_referee_person_id`** and persisted on **`base_application.referee_person_id`** (§8 migration). The create RPC **re-validates** that the supplied `p_referee_person_id` is within the eligible set before accepting it — the portal pre-selection is not trusted as authority. If a `referee` requirement exists and `p_referee_person_id` is null, the RPC raises a validation-class failure.
- **FS-13** — Consent snapshots are inserted into **`base_consent`** during the same transaction as application creation. Rows link `application_id`, `consented_by` (authenticated actor), `consented_for` (applicant `person_id`), `organisation_id`, `event_id`, `consent_type`, and non-null **`verbatim_text`**. `booking_id` remains null for registration-time consents.
- **FS-14** — Consent payload **`p_consents`** is a JSON array of objects `{ "consent_type": string, "verbatim_text": string }`. Each `consent_type` must correspond to a **`pre_submission_checks`** entry **`key`** rendered by `WorkflowPreSubmissionChecks`; `verbatim_text` is the participant-visible acknowledgement snapshot for that check at submit time (portal obligation). If a `consent_type` value in `p_consents` does not match a known `pre_submission_checks` key, the row is still inserted — validation of the key set is a portal responsibility before submit.

### 4.4 Supporting RPCs

- **FS-15** — **`app_base_eligible_referees_for_applicant`** returns referee candidates for `(event_id, applicant_person_id, organisation context)`. Eligibility rule: the candidate must be a `core_member` with `organisation_id` in the ancestor set for `p_organisation_id` (implemented via `org_ancestors` closure-table join) with `deleted_at IS NULL` on both the `core_member` and `core_person` rows, and must not be the applicant themselves (`person_id ≠ p_applicant_person_id`). Implemented as **`SECURITY DEFINER`** with `search_path` hardened to `public`. Permission checks: `auth.uid()` must be non-null; the caller must be either (a) the applicant — `core_person.user_id = auth.uid()` for the row where `core_person.id = p_applicant_person_id` — or (b) a user with `rbac_check_permission_simplified(auth.uid(), 'create:page.applications', p_organisation_id, p_event_id, get_base_app_id(), 'applications') = true`.
- **FS-16** — **`app_base_application_check_reissue_token`** default **`p_expiry_interval`** is **`'14 days'`** (still overridable). Reissue queues a follow-up system notification through `app_base_queue_check_notification`: **`guardian_approval`** check reissue queues `base.guardian_request_reissued` (BA17 **SN-02**); **`referee`** check reissue queues `base.referee_request_reissued` (BA17 **SN-04**). The dispatch contract is mechanically identical to first-issue (FS-08) — only the `system_key` differs. BA06 and BA07 are the upstream call sites that invoke the reissue RPC.
- **FS-17** — Existing token resolve, submit, and set-status RPCs (`app_base_application_check_resolve_token`, `app_base_application_check_submit`, `app_base_application_set_status`) remain as documented in architecture; BA05a does not redefine their core semantics beyond FS-16 default.

### 4.5 pace-core2 renderer alignment

- **FS-18** — Registration UI that embeds shared workflow rendering uses **`WorkflowFormRenderer`** from `@solvera/pace-core/forms` with props and types per §9.
- **FS-19** — Pre-submission acknowledgements use `workflow_config.pre_submission_checks` and `WorkflowPreSubmissionChecks`; submission payloads must carry consent snapshots required by FS-13 / FS-14.

---

## 5. Visual specification (portal)

Not applicable in BASE UI. BA05a defines backend registration/submission contracts consumed by portal/runtime slices.

## 6. Business rules

| ID | Rule |
|----|------|
| BR-01 | `access_mode = 'authenticated_member'` is the default participant posture; `'public'` only when explicitly allowed by product governance. |
| BR-02 | Scope denial and eligibility denial **must** surface as different exception classes for adapter mapping — see §7.4 for canonical exception names. |
| BR-03 | Backend-derived status per FS-07 — never caller-authoritative. |
| BR-04 | Carer optional globally — never requirement-gated. |
| BR-05 | Referee requirement implies non-null **`p_referee_person_id`** passed to create **and** re-validated against `app_base_eligible_referees_for_applicant` eligibility criteria inside the create RPC. |
| BR-06 | Guardian approval recipients for guardian checks are resolved via **`core_contact`** with `contact_type_id = 1`. `core_contact_type.id = 1` is the stable seed value for "Parent / Guardian" in this deployment. Participant does not free-type guardian addresses for this check type. |
| BR-07 | Magic-link issue/reissue default expiry is **14 days** — FS-16. |
| BR-08 | Consent rows are immutable after insert; `verbatim_text` is a legal/audit snapshot. |
| BR-09 | Portal **must not** walk organisation trees client-side for referee eligibility — FS-15 only. |
| BR-10 | All `base_application_check` rows are created with `status = 'pending'`. No `active` status exists in the schema. A check is considered "actionable" when it is `pending` with a non-null `token_hash` and future `token_expires_at` (token-requiring types) or simply `pending` awaiting organiser action (non-token types). |

---

## 7. Consumer contract, RPC catalogue, and errors

### 7.1 Primary orchestrator

**`app_base_application_create`** — extended signature (conceptual; exact SQL in migration):

| Parameter | Type | Notes |
|-----------|------|------|
| `p_event_id` | uuid | Required |
| `p_person_id` | uuid | Applicant — required |
| `p_registration_type_id` | uuid | Required |
| `p_submitted_at` | timestamptz | Default `now()` |
| `p_organisation_id` | uuid | Required — applicant's organisation context; used for scope check and org-matching validation |
| `p_form_id` | uuid | Nullable; when non-null, validated against `base_form_registration_type` binding |
| `p_carer_person_id` | uuid | Optional — FS-11 |
| `p_referee_person_id` | uuid | Optional — required when type has `referee` requirement — FS-12 |
| `p_consents` | jsonb | Default `'[]'` — FS-13 / FS-14 |
| `p_user_id` | uuid | Default `auth.uid()` |

**Removed / non-authoritative:** `p_status` (breaking change — remove from signature; do not accept as caller input).

**Returns:** `uuid` — the new `base_application.id`.

### 7.2 Referee lookup

**`app_base_eligible_referees_for_applicant`**

- **Status:** present in dev-db and part of the canonical BA05a contract surface.
- **Inputs:** `p_event_id uuid`, `p_applicant_person_id uuid`, `p_organisation_id uuid`.
- **Returns:** set of rows with the following shape:

| Column | Type | Notes |
|--------|------|-------|
| `person_id` | uuid | `core_person.id` of candidate referee |
| `first_name` | text | `core_person.first_name` |
| `last_name` | text | `core_person.last_name` |
| `preferred_name` | text | `core_person.preferred_name` — nullable |
| `organisation_id` | uuid | `core_member.organisation_id` — the ancestor org where candidate holds membership |
| `organisation_name` | text | `core_organisations.name` for `organisation_id` |

- **Eligibility mechanism:** candidates are `core_member` rows where `organisation_id` is in the ancestor set for `p_organisation_id` (implemented with `org_ancestors` closure-table joins), joined to `core_person`, excluding the applicant (`core_person.id ≠ p_applicant_person_id`), excluding soft-deleted persons (`core_person.deleted_at IS NULL`), and excluding soft-deleted member rows (`core_member.deleted_at IS NULL`). No `ltree` — closure table only.

### 7.3 Internal helpers

**`event_applicant_org_allowed`** — internal to `app_base_application_create` only; not a consumer API.

**`app_base_advance_application_checks(p_application_id uuid)`** — internal chain progression helper; not a consumer API. Called by `app_base_application_create` after first-check activation, and by every satisfaction RPC (BA06, BA07, TEAM-via-BASE) after a check status is written. This helper is present in dev-db as part of the BA05a contract surface. Full semantics: `docs/requirements/base/BASE-architecture.md` §4 — Check chain state machine.

### 7.4 Error catalogue

The following canonical Postgres exception names are the binding contract between the create RPC migration and all consuming adapters. Adapters must dispatch on these names. Exact `RAISE EXCEPTION` call syntax is owned by the migration PR; these names are the agreed surface.

**Validation class** — malformed payload or missing required inputs:

| Exception name | Trigger |
|----------------|---------|
| `base_application_user_required` | `p_user_id` is null |
| `base_application_person_required` | `p_person_id` is null |
| `base_application_event_required` | `p_event_id` is null |
| `base_application_org_required` | `p_organisation_id` is null |
| `base_application_type_required` | `p_registration_type_id` is null |
| `base_application_carer_invalid` | `p_carer_person_id` equals `p_person_id`, or carer person not found |
| `base_application_referee_required` | Type has `referee` requirement and `p_referee_person_id` is null |
| `base_application_referee_ineligible` | `p_referee_person_id` is non-null but fails eligibility re-validation |

**Scope class** — registration scope forbids the applicant/organisation context:

| Exception name | Trigger |
|----------------|---------|
| `base_application_scope_denied` | `event_applicant_org_allowed` returns false |
| `base_application_org_mismatch` | Organisation context mismatch between session org and `p_organisation_id` |
| `base_application_event_not_visible` | Event is not visible to the applicant's organisation |

**Eligibility class** — `base_registration_type_eligibility` rules fail:

| Exception name | Trigger |
|----------------|---------|
| `base_application_eligibility_failed` | Any eligibility rule for the selected type fails (membership_type, dob_before, or dob_after) |

**Contract class** — form/type configuration errors:

| Exception name | Trigger |
|----------------|---------|
| `base_application_event_not_found` | `p_event_id` does not resolve to a `core_events` row |
| `base_application_type_not_found` | `p_registration_type_id` does not resolve to a `base_registration_type` row |
| `base_application_type_inactive` | Registration type exists but `is_active = false` |
| `base_application_type_event_mismatch` | Type's `event_id` does not match `p_event_id` |
| `base_application_type_org_mismatch` | Type's `organisation_id` does not match `p_organisation_id` |
| `base_application_form_binding_invalid` | `p_form_id` supplied but no `base_form_registration_type` binding exists for this type/form/event/org combination |
| `base_application_duplicate` | A `base_application` row already exists for this `(event_id, person_id)` combination — the DB UNIQUE constraint would otherwise surface a raw violation |

**Permission class:**

| Exception name | Trigger |
|----------------|---------|
| `base_application_permission_denied` | Caller is not the applicant and does not have `create:page.applications` permission |

---

## 8. Data and schema references

### 8.1 Tables touched by this slice

| Table | Role |
|-------|------|
| `base_application` | Created by orchestrator; `carer_person_id` (exists); `referee_person_id` (added per §8.2) |
| `base_application_check` | Initialised when status `under_review`; status constraint: `pending \| satisfied \| failed \| waived` |
| `base_consent` | Snapshots at creation |
| `base_registration_type_eligibility` | Read during create — `rule_type` values: `membership_type`, `dob_before`, `dob_after` |
| `base_registration_type_requirement` | Drives status + checks — `check_type` values: `payment`, `guardian_approval`, `home_leader_approval`, `referee`, `designated_org_review`, `event_approval` |
| `core_form_responses` | Subject linking after create |
| `core_events` | `registration_scope` |
| `core_person` | Applicant, carer, and referee person rows; `date_of_birth` used for eligibility evaluation |
| `core_member` | Applicant membership row for `membership_type` eligibility; referee candidate set |
| `core_contact` | Guardian contact resolution for `guardian_approval` check type — filtered by `contact_type_id = 1` (Parent / Guardian) |
| `org_ancestors` | Referee eligibility — ancestor closure for applicant's organisation |

### 8.2 Required migration (backend deliverable)

Add **`base_application.referee_person_id`** as a nullable `uuid` column with a foreign key to **`core_person(id)`** — the same person table referenced by `base_application.person_id` and `base_application.carer_person_id`. On delete behaviour: `SET NULL` (consistent with `carer_person_id` FK). Add an index on `referee_person_id` for downstream query performance.

The constraint should allow null (referee not always applicable) and must not enforce uniqueness (two applications could reference the same referee).

### 8.3 MCP verification prompts (dev-db `rkytnffgmwnnmewevqgp`)

After migrations:

1. Confirm **`base_application.referee_person_id`** exists as nullable uuid with FK to `core_person(id)` and `ON DELETE SET NULL`.
2. Confirm **`app_base_application_create`** signature no longer exposes `p_status` as a caller-authoritative parameter.
3. Confirm **`app_base_eligible_referees_for_applicant`** exists, is `SECURITY DEFINER`, and `search_path` is hardened to `public`.
4. Confirm **`app_base_application_check_reissue_token`** default interval is `'14 days'` when `p_expiry_interval` is omitted.
5. Confirm **`base_application_check`** status check constraint is `('pending', 'satisfied', 'failed', 'waived')` — no `active` value.

---

## 9. pace-core2 dependency map

### 9.1 Required symbols actually used in this slice

| Symbol | Import policy | Why used in BA05a |
|---|---|---|
| `WorkflowFormRenderer` | Scoped `/forms` exception path (forms-runtime module surface) | Runtime submission consumer contract |
| `WorkflowSubmissionPayload` types/builders | Scoped `/forms` exception path (forms-runtime module surface) | Canonical payload shape for orchestration |

### 9.2 Slice-specific caveats only

- BA05a is backend-contract focused; BASE route implementation is out of scope.
- Submission orchestration remains RPC-driven and aligned to BA02/CR21 contracts.
- `app_base_advance_application_checks` remains part of transactional chain semantics.
- Import style in this slice follows root-first policy; `/forms` references are documented scoped exceptions.

## 10. Permission matrix

| Capability | Who | Where enforced |
|------------|-----|----------------|
| Self-service registration submit | Authenticated participant — `core_person.user_id = auth.uid()` | RPC — `app_base_application_create` |
| Organiser-submitted application | User with `create:page.applications` permission for event | RPC — `app_base_application_create` |
| Referee listing | Authenticated participant (own lookup) or user with `create:page.applications` | `app_base_eligible_referees_for_applicant` — SECURITY DEFINER with explicit checks per FS-15 |
| Organiser status overrides | User with `create:page.applications` or admin equivalent | `app_base_application_set_status` — BA06 scope |

---

## 11. Acceptance criteria

- **AC-01** — Given a registration type with **no** requirements, when create RPC succeeds, then `base_application.status = 'approved'` and no `base_application_check` rows exist for that application.
- **AC-02** — Given a type **with** ordered requirements, when create succeeds, then: `base_application.status = 'under_review'`; one `base_application_check` row exists per requirement, all with `status = 'pending'`; the row with the lowest `sort_order` has a non-null `token_hash` and future `token_expires_at` when the first check type is `guardian_approval` or `referee`; and rows with higher `sort_order` have null `token_hash` and null `token_expires_at`.
- **AC-03** — Given eligibility failure, when create is invoked, then the exception class is **`base_application_eligibility_failed`** — not `base_application_scope_denied`.
- **AC-04** — Given optional carer omitted, when create succeeds, then `carer_person_id` is null; given valid distinct carer, then `carer_person_id` is persisted.
- **AC-05** — Given a `referee` requirement type, when submit omits `p_referee_person_id`, then create raises `base_application_referee_required`; when submit supplies an ineligible person id, then create raises `base_application_referee_ineligible`.
- **AC-06** — Given `pre_submission_checks` entries, when portal submits snapshots via `p_consents`, then matching `base_consent` rows exist with non-null `verbatim_text` and null `booking_id`.
- **AC-07** — Given eligible org fixture data, referee RPC returns only persons who are `core_member` of an ancestor organisation of the applicant's org, are non-deleted, and are not the applicant.

---

## 12. Observability and operations

- Verify migration outputs for `referee_person_id`, create-RPC semantics, and eligible-referees RPC.
- Verify create outcomes for requirement-free vs requirement-backed registration types.
- Verify required/ineligible referee handling paths and exception names.
- Verify consent snapshot persistence and exclusion rules.
- Verify token-reissue default interval behaviour and check-status contracts.

## 13. Rollback and blast radius

- RPC tests cover eligibility/scope/referee failure paths.
- Orchestrator tests cover status derivation and check-chain initialisation.
- Schema tests verify new column/constraints and expected defaults.
- Adapter-facing tests preserve error-name and payload contracts.

## 14. Build execution metadata

- BA05a is a backend contract slice with schema/RPC work in scope.
- Coordinate signature changes with downstream BA05b/BA06/BA07 consumers.
- Stop on missing migration dependencies or contract parity failures.
- Do not expand into portal/UI implementation.

## 15. Verification guidance

- Migration and RPC checks in §12 are complete and recorded.
- Tests in §13 cover critical create/eligibility/referee/status paths.
- Downstream consumers are unblocked on documented contract signatures.
- Evidence is captured in backend-ready artifacts.

## 16. Do-not regress list

- Do not allow client-side direct inserts into `base_application`.
- Do not reintroduce `table_name`/`column_name` submission semantics.
- Do not bypass server-side eligibility/referee resolution with client logic.
- Do not restore deprecated reissue default or check-status patterns.
- Do not expose caller-authoritative status in create RPC input.

## 17. Reference documents and sibling slices

- `docs/requirements/base/BASE-project-brief.md`
- `docs/requirements/base/BASE-architecture.md`
- `docs/requirements/base/BA02-shared-forms-platform-contracts-requirements.md`
- `docs/requirements/base/BA03-forms-authoring-and-base-integration-requirements.md`
- `docs/requirements/base/BA04-registration-setup-and-policy-requirements.md`
- `docs/requirements/base/BA06-applications-admin-and-review-requirements.md`
- `docs/requirements/base/BA17-communications-and-system-notifications-requirements.md`
- `docs/requirements/base/BA18-base-dev-seed-data-requirements.md`
- `packages/core/docs/requirements/CR21-workflow-forms-runtime.md`

## 18. Implementing agent instructions (backend contract engineer)

- Implement BA05a as backend contract/migration work only.
- Keep exception names/signatures/transaction sequencing exactly as specified.
- Stop and report on dependency or contract blockers.
