# BA05b — Participant Application Progress

## Slice metadata

- Status: Draft
- Depends on: BA05a (Registration Entry and Application Submission — application creation, initial checks, schema fields including `referee_person_id`)
- Backend impact: New RPC contract and payload shaping (see §7)
- Frontend impact: **None** — BA05b is a backend-only slice. No UI is implemented in BASE or portal as part of this slice. The participant progress page is owned by a separate portal slice that consumes this RPC.

## 2. Overview

This slice defines the **participant-safe read contract** for a single event application after submission: raw application workflow status, ordered approval-check progress aligned to database constraints, and human-readable labels for each requirement **type**. Implementation is a **single Supabase RPC** that shapes and authorises the response.

**BA05b is a backend-only slice.** No UI is implemented in BASE or portal as part of this deliverable. The participant progress page is owned by a separate portal slice that calls this RPC. §5 of this slice defines the minimum content and state obligations that portal page must satisfy; the portal slice owns the full visual specification.

---

## 3. What this slice delivers

### 3.1 Contract surface

**Purpose.** Provide one authoritative, tamper-resistant read boundary so participants never rely on direct table projections that could expose `token_hash`, `token_expires_at`, or reviewer metadata.

**BASE surfaces.** None — no routes and no BASE app UI.

**Portal consumer obligations.** The participant application progress page calls **`app_base_application_progress_get`** with the URL's application id, and displays application status, registration type summary, and an ordered list of checks with **machine `check_type`**, **participant-facing requirement label**, and **raw check `status`** from the database. Full portal page specification is owned by the portal slice; §5 defines the minimum content obligations this RPC contract imposes on that page.

### 3.2 Boundaries

This slice does **not** own:

- Registration submission — BA05a.
- Organiser application review UI — BA06.
- Token approval magic-link landing flows — BA07 / portal PR20.
- Communications content — BA17.
- Participant progress page UI — portal slice (separate, to be authored).

### 3.3 Architectural posture

- Import policy is root-first for consuming apps: use `@solvera/pace-core` as the default import surface. Scoped entrypoints are exception-only and used only when the root export does not expose the required symbol or a documented advanced/performance/migration case requires the scoped path.
- **Single RPC** is the only supported participant read contract for this slice. Consumers must not infer progress by querying `base_application` or `base_application_check` directly from the browser unless a future slice explicitly replaces this contract.
- Check **status** values exposed to participants are **exactly** the literals allowed by the database CHECK constraint on `base_application_check.status` (**§6**).
- Application **status** is returned **verbatim** from `base_application.status` — no secondary label layer (**§6**).
- **`carer_person_id`** and **`referee_person_id`** are omitted from the RPC payload. The referee's display name is returned as **`referee_name`** (§7.2) — the UUID is not exposed to participants.

### 3.4 Portal route: guards and evaluation ordering (consumer contract)

The portal owns routing; BA05b specifies observable behaviour for QA:

- **Order:** Resolve authenticated session first. If there is no authenticated member session, show the portal's standard sign-in affordance — do not call the RPC.
- **Order:** After session exists, if `applicationId` route param is syntactically invalid UUID, show participant-safe **invalid identifier** state — do not call the RPC.
- **Order:** Call **`app_base_application_progress_get`**. If RPC returns authorisation denial (`base_application_access_denied`), show **access denied** (same copy for "wrong user" and "unknown id" — no oracle).
- **Order:** On success, render progress from payload. **Empty `checks` array** is valid when the application has no check rows (for example requirement-free registration type per BA05a).

---

## 4. Functional specification

Prefix **PP-** (participant progress contract). Each item is verifiable without reading implementation source.

### 4.1 RPC availability and auth

- **PP-01** — Function **`app_base_application_progress_get`** exists on dev-db after migration and is callable by authenticated portal users.
- **PP-02** — RPC succeeds **only** when **`base_application_is_applicant(p_application_id, auth.uid())`** is true for the resolved caller identity.
- **PP-03** — RPC **never** returns data for an application that fails the applicant check, regardless of whether the row exists.

### 4.2 Payload shape

- **PP-04** — Successful response is a single **`jsonb`** object with three keys: **`application`**, **`registration_type`**, **`checks`** (array, possibly empty).
- **PP-05** — **`application`** contains **only** fields listed in §7.2; no additional keys.
- **PP-06** — **`registration_type`** contains **only** fields listed in §7.2; no additional keys.
- **PP-07** — Each element of **`checks`** contains **only** fields listed in §7.2; no additional keys.
- **PP-08** — **`checks`** is sorted ascending by **`sort_order`** (requirement order).

### 4.3 Field semantics

- **PP-09** — **`application.status`** is the raw `base_application.status` text value.
- **PP-10** — Each **`checks[].status`** is the raw `base_application_check.status` text value and is one of: `pending`, `satisfied`, `failed`, `waived`.
- **PP-11** — Each **`checks[].check_type`** matches `base_registration_type_requirement.check_type` for the joined requirement row.
- **PP-12** — Each **`checks[].participant_check_label`** matches **§6** mapping for that `check_type` (Australian English).

### 4.4 Non-exposure

- **PP-13** — Serialised JSON **never** contains keys: `token_hash`, `token_expires_at`, `actioned_by`, `actioned_at`, `notes`, `carer_person_id`, `referee_person_id`.
- **PP-14** — Serialised JSON **never** contains staff audit columns from **§7.3 Exclusions**.

### 4.5 Consumer UI obligations (portal)

- **PP-15** — Participant progress page **does not** render organiser navigation, review actions, or token tooling.
- **PP-16** — Participant progress page renders **`participant_check_label`** for human-readable requirement identification and may render **`check_type`** as supplementary technical detail only if product chooses — labels remain authoritative for copy.

### 4.6 Categories not applicable (BASE lane)

- **Page entry / shell (BASE):** N/A — BASE ships no route.
- **Loading / error UI (BASE):** N/A — handled in portal.

---

## 5. Portal consumer obligations

Not applicable in BASE UI. This slice defines RPC payload contract and portal consumer obligations.

## 6. Business rules

### 6.1 Check status vocabulary (participant-visible)

Participant-visible check status strings **must match** the database CHECK constraint on `public.base_application_check.status`:

| Value | Meaning (product) |
|-------|-------------------|
| `pending` | Requirement not yet satisfied. |
| `satisfied` | Requirement satisfied. |
| `failed` | Requirement failed — participant sees this literal only; remediation flows live in other slices / support. |
| `waived` | Requirement waived — participant sees this literal only. |

No alternate labels or normalisation layers are applied to **`checks[].status`** in the RPC or UI.

### 6.2 Application status (participant-visible)

**`application.status`** is returned unchanged from `base_application.status`. Expected lifecycle values follow **`docs/requirements/base/BASE-architecture.md`** §4 Registration and Application Lifecycle (`draft`, `submitted`, `under_review`, `approved`, `rejected`, `withdrawn`). The database column has **no CHECK constraint**; portal displays whatever string is stored without mapping.

### 6.3 Requirement type → participant label mapping

**`participant_check_label`** is derived from **`check_type`** using this authoritative mapping (Australian English):

| `check_type` (DB) | `participant_check_label` |
|-------------------|---------------------------|
| `payment` | Payment |
| `guardian_approval` | Guardian approval |
| `home_leader_approval` | Home leader approval |
| `referee` | Referee approval |
| `designated_org_review` | Organisation review |
| `event_approval` | Event approval |

If the CASE expression encounters a `check_type` not present in the mapping table above, the function **must `RAISE EXCEPTION`** — no silent fallback, no NULL return, no generic string. This ensures that deploying a new `check_type` without a corresponding slice amendment fails loudly at the RPC layer rather than corrupting participant-visible labels. If a future migration adds a new `check_type`, this slice must be amended before production use.

### 6.4 Excluded fields (non-exposure guarantee)

The following columns **must never** appear in the RPC JSON output:

From **`base_application_check`:** `token_hash`, `token_expires_at`, `actioned_by`, `actioned_at`, `notes`, `created_at`, `updated_at`.

From **`base_application`:** `referee_person_id` (not exposed as UUID — resolved to `referee_name` in payload instead), `carer_person_id`, `status_updated_at`, `status_updated_by`, `created_at`, `created_by`, `updated_at`, `updated_by`.

### 6.5 Authorisation denial semantics

Denial responses **must not** reveal whether an application id exists for another user. The RPC raises `RAISE EXCEPTION 'base_application_access_denied'` (SQLSTATE `P0001`) for any authorisation failure regardless of cause — "application not found", "wrong user", and "unauthenticated" all produce the same exception. Portal maps a single denial presentation with no existence hint.

---

## 7. API / Contract

### 7.1 RPC

| Name | Args | Returns |
|------|------|---------|
| `app_base_application_progress_get` | `p_application_id uuid` | `jsonb` |

Security: **`SECURITY DEFINER`** with hardened `search_path`; caller identity resolved via `auth.uid()` internally — no caller-supplied user id parameter. Applicant verification via **`base_application_is_applicant`**.

**Denial mechanism:** when authorisation fails (applicant check false, application not found, or unauthenticated), the function raises `RAISE EXCEPTION 'base_application_access_denied'` with SQLSTATE `P0001` per the BASE RPC error convention (`BASE-architecture.md` — Cross-cutting contracts → RPC error conventions). The portal catches this exception and maps to the access denied state (§5.2). No distinction is made between "application does not exist" and "caller is not the applicant."

### 7.2 Success payload schema

Top-level object:

```json
{
  "application": { "...": "..." },
  "registration_type": { "...": "..." },
  "checks": [ { "...": "..." } ]
}
```

**`application` object (exact keys):**

| Key | Type | Source |
|-----|------|--------|
| `id` | uuid | `base_application.id` |
| `event_id` | uuid | `base_application.event_id` |
| `organisation_id` | uuid | `base_application.organisation_id` |
| `person_id` | uuid | `base_application.person_id` |
| `registration_type_id` | uuid | `base_application.registration_type_id` |
| `form_id` | uuid \| null | `base_application.form_id` |
| `referee_name` | string \| null | `COALESCE(cp.preferred_name, cp.first_name) \|\| ' ' \|\| cp.last_name` via LEFT JOIN `core_person cp ON cp.id = base_application.referee_person_id`; null when `referee_person_id` is null |
| `status` | string | `base_application.status` |
| `submitted_at` | string \| null | ISO-8601 `base_application.submitted_at` |

**`registration_type` object (exact keys):**

| Key | Type | Source |
|-----|------|--------|
| `id` | uuid | `base_registration_type.id` |
| `name` | string | `base_registration_type.name` |
| `description` | string \| null | `base_registration_type.description` |

**`checks[]` object (exact keys):**

| Key | Type | Source |
|-----|------|--------|
| `id` | uuid | `base_application_check.id` |
| `requirement_id` | uuid | `base_application_check.requirement_id` |
| `sort_order` | integer | `base_registration_type_requirement.sort_order` |
| `check_type` | string | `base_registration_type_requirement.check_type` |
| `participant_check_label` | string | Derived per §6.3 in SQL |
| `status` | string | `base_application_check.status` |

### 7.3 Explicit exclusions

Keys listed in **§6.4** must be absent from serialised output. `referee_person_id` is excluded; `referee_name` is the participant-safe surface for referee identification.

### 7.4 Cross-slice handoff

- **BA05a:** Creates application rows and initial `base_application_check` rows; adds **`referee_person_id`** column to `base_application` (nullable FK to `core_person`). BA05b reads those rows through the RPC only — `referee_person_id` is resolved to `referee_name` and the UUID is never surfaced.
- **pace-portal:** Owns UX and routing via the portal slice; must call **`app_base_application_progress_get`** for progress data.

---

## 8. Data and schema references

**`base_application_is_applicant` semantics:** returns `true` if `base_application.person_id` matches `auth.uid()` (the resolved session identity) for the given `p_application_id`, using definer privileges to bypass RLS. Carer linkage is not considered — only the applicant's own `person_id` satisfies the check.

| Artefact | Role |
|----------|------|
| `base_application` | Source row for application subset; `referee_person_id` FK column added by BA05a migration |
| `base_application_check` | Source rows for checks — sensitive columns stripped |
| `base_registration_type` | Registration type display |
| `base_registration_type_requirement` | `check_type`, `sort_order` join |
| `core_person` | LEFT JOIN on `base_application.referee_person_id` to resolve `referee_name`; requires BA05a migration to add the FK column |
| `base_application_is_applicant` | Authorisation primitive — see semantics note above |

### 8.1 MCP verification (dev-db `rkytnffgmwnnmewevqgp`)

**BA05a dependency:** payload shape verification (step 2 below) requires the `base_application.referee_person_id` column to exist. This column is added by BA05a's migration. Block step 2 until BA05a migration is applied to dev-db.

After migration:

1. `\df+ app_base_application_progress_get` — signature matches §7.1 (single `p_application_id uuid` argument; no `p_user_id`).
2. Applicant fixture calls RPC → payload matches §7.2 key sets; `referee_name` is a string or null (not a UUID); `referee_person_id` absent from serialised output.
3. `SELECT app_base_application_progress_get(...)` — cast result to text and assert no substring `token_hash` / `token_expires_at` / `carer_person_id` / `referee_person_id`.
4. Negative test: second user calls RPC for first user's application → `base_application_access_denied` exception raised.

---

## 9. pace-core2 imports

### 9.1 Required symbols actually used in this slice

| Symbol | Import policy | Why used in BA05b |
|---|---|---|
| _None in BASE app_ | Root-first policy applies; no pace-core import required in this slice | BA05b is backend RPC + consumer contract slice |

### 9.2 Slice-specific caveats only

- Response payload intentionally excludes sensitive identifiers while exposing `referee_name`.
- Status and check literals are returned as stored without remapping in this contract.
- Caller identity is derived from `auth.uid()`; caller-supplied identity is not supported.
- Import style in this slice follows root-first policy even though no pace-core symbols are consumed.

## 10. Permission and access rules

| Actor | `app_base_application_progress_get` |
|-------|-------------------------------------|
| Authenticated applicant (`base_application.person_id` matches `auth.uid()` for the given application) | Allow |
| Authenticated user who is not the applicant (includes organisers and privileged roles when viewing someone else's application) | Deny — `base_application_access_denied` |
| Unauthenticated | Deny — `base_application_access_denied` |

Privileged inspection of arbitrary applications uses BA06 organiser contracts — not this RPC.

---

## 11. Acceptance criteria

- **AC-01** — Given an authenticated applicant for application **A**, when the RPC is called with **A**'s id, then response matches §7.2 shape and **`checks` sort order** matches requirement **`sort_order`** ascending.
- **AC-02** — Given the same caller, when **`checks[].status`** is read from a row with each allowed DB status in fixtures, then returned strings equal **`pending`**, **`satisfied`**, **`failed`**, **`waived`** respectively with no transformation.
- **AC-03** — Given a successful payload, when the JSON is inspected, then keys listed in §6.4 are **absent** from the serialised object; specifically `referee_person_id` and `carer_person_id` are absent and `referee_name` is present (string or null).
- **AC-04** — Given an authenticated user who is **not** the applicant, when the RPC is called for that application id, then the call raises `base_application_access_denied` (§6.5).
- **AC-05** — Given an application with **no** check rows, when the applicant calls the RPC, then **`checks`** is **`[]`** and **`application`** is still populated.
- **AC-06** — Given each **`check_type`** in §6.3 present in seed data, when the RPC returns those rows, then **`participant_check_label`** matches the §6.3 table exactly.
- **AC-07** — Given **`application.status`** is `under_review`, when the applicant loads the portal progress page (integration / QA), then UI displays the literal **`under_review`** string from payload without mapping.
- **AC-08** — Given an application with a non-null `referee_person_id` (requires BA05a migration), when the RPC returns the payload, then `application.referee_name` is a non-null string matching `COALESCE(preferred_name, first_name) || ' ' || last_name` from `core_person`; `referee_person_id` is absent from the serialised output.

Traceability: AC-01→PP-04–08; AC-02→PP-10; AC-03→PP-13–14; AC-04→PP-02–03; AC-05→PP-08 edge; AC-06→PP-12; AC-07→PP-09; AC-08→§7.2 referee_name.

---

## 12. Verification

- Verify applicant-owned progress retrieval shape and check ordering.
- Verify non-applicant access denial with `base_application_access_denied`.
- Verify forbidden fields remain excluded from payload.
- Verify `referee_name` inclusion and `checks: []` behaviour for no-check applications.

## 13. Testing requirements

- Backend tests cover auth positive/negative, shape assertions, exclusions, and `referee_name` mapping.
- Consumer contract tests cover expected JSON shape and denial handling.
- Integration tests cover happy path and denied access branches.

## 14. Build execution rules

- BA05b delivers backend contract changes; portal UI is out of scope.
- Keep RPC signature as `p_application_id` only with caller from `auth.uid()`.
- Stop on access-control or payload-exclusion parity failures.

## 15. Done criteria

- BA05b RPC verification steps are complete and recorded.
- Required contract tests pass for shape and access semantics.
- Downstream consumers use RPC contract without table-level fallback.

## 16. Do not

- Do not expose sensitive check/application internals in participant payloads.
- Do not alter DB status literals in response mapping.
- Do not add caller-supplied `p_user_id` parameter.
- Do not use participant RPC for organiser review surfaces.
- Do not implement portal UI in this slice.

## 17. References

- `docs/requirements/BASE-project-brief.md`
- `docs/requirements/BASE-architecture.md`
- `docs/requirements/BA05a-registration-entry-and-application-submission-requirements.md`
- `docs/requirements/BA06-applications-admin-and-review-requirements.md`
- `docs/requirements/BA18-base-dev-seed-data-requirements.md`

## 18. Implementing Agent Instructions

- Implement backend RPC contract only; no BASE or portal UI work.
- Preserve payload allow-list and denial semantics exactly.
- Stop on dependency blockers and record evidence.
