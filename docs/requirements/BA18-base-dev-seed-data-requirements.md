# BA18 — BASE Dev Seed Data

---

## Slice metadata

- Status: Draft
- Depends on: BA00, BA01
- Backend impact: Read contract only (schema and seed RPC implemented in migration `20260428100259_ba18_seed_reset_contract`; no new schema changes in this slice)
- Frontend impact: Non-UI

## 2. Overview

BA18 defines the authoritative, repeatable dev/staging data setup for BASE verification. It owns one execution contract — the `app_base_seed_reset_dev` RPC — that populates a deterministic set of event-scoped workflow rows across the registration, application, and forms domains so that downstream slice QA runs have DB-backed non-empty state to work with. BA18 has no user-facing routes, no UI surface, and no pace-core2 imports. Its output is a validated, idempotent data state in the dev-db that downstream slice QA packs can reference by stable identifiers. This slice is a hard prerequisite for non-empty QA verification in every BASE route that depends on persisted workflow entities.

---

## 3. What this slice delivers

### Purpose

BA18 establishes a canonical seed/reset workflow for the BASE dev/staging environment. It ensures that QA operators and build agents can exercise every DB-backed UI surface across the BASE slice family without relying on ad hoc SQL, one-off inserts, or route-local hardcoded records. The seed produces deterministic, event-scoped rows with stable UUIDs and a named event code so that test packs reference the same records across runs.

### Surfaces

BA18 owns one execution surface only:

- **`app_base_seed_reset_dev(p_organisation_id uuid, p_actor uuid) RETURNS jsonb`** — the canonical seed/reset RPC in the `public` schema. This is the only authoritative mechanism for setting up BASE dev/staging data. It is invoked by a QA operator or build agent with service-role credentials or super-admin permission. It is not a UI route.

### Boundaries

- BA18 does not own any application route, page, or component.
- BA18 does not own schema migrations. The required schema (all 16 BASE tables and the seed/reset RPC) is delivered by the migration suite documented in `docs/database/domains/base.md`. Schema readiness is a prerequisite for BA18 execution, not a deliverable of it.
- BA18 does not seed units, activity offerings, activity sessions, activity bookings, activity preferences, consent records, scan points, or scan events. Each downstream slice (BA08, BA09, BA10, BA11, BA12, BA13) is responsible for its own QA data where BA18 coverage is insufficient.
- BA18 does not own production data. No production invocation path exists and none is defined.
- BA18 does not modify the behaviour of any shipping BASE route.

### Architectural posture

- Import policy is root-first for consuming apps: use `@solvera/pace-core` as the default import surface. Scoped entrypoints are exception-only and used only when the root export does not expose the required symbol or a documented advanced/performance/migration case requires the scoped path.
- The only approved seed execution path is calling `app_base_seed_reset_dev` via service_role or as a super_admin authenticated user. No raw SQL inserts in place of the RPC are permitted.
- The RPC is idempotent by design: re-running produces the same output state without duplicate-key or constraint errors.
- Seed records are event-scoped to event_id `d2df5d75-cf06-4856-a9cf-c3e8fba7f6b1` (event_code `BASEBA18`). No seed data bleeds into other events or organisations.
- DB inspection, seed execution, and post-run verification follow the Supabase MCP workflow defined in `BASE-architecture.md` § "Database and Supabase MCP workflow (AI execution)".

---

## 4. Functional specification

BA18 is a non-UI slice. The functional specification describes the data outcomes a QA operator or build agent must be able to verify after a successful seed run, and the execution properties the seed workflow must exhibit.

**Seed execution**

1. F-01 — A QA operator or build agent with service_role credentials or super_admin permission can invoke `app_base_seed_reset_dev(p_organisation_id, p_actor)` against the dev-db. The call completes without error and returns a jsonb execution summary.
2. F-02 — Invoking the RPC a second time without any intervening data changes produces the same seeded state without raising a duplicate-key or constraint violation. This is the idempotency guarantee.
3. F-03 — The `anon` Postgres role does not have EXECUTE on `app_base_seed_reset_dev`. Any attempt to call the RPC as an unauthenticated user is rejected by Postgres before the function body executes.
4. F-04 — An authenticated user who does not satisfy `is_super_admin()` is rejected by the function body guard, even though the `authenticated` role has EXECUTE granted. The RPC internally enforces `is_service_role() OR is_super_admin(safe_get_user_id_for_rls())`.

**Seeded event**

5. F-05 — After a successful seed run, `core_events` contains a row with `event_id = 'd2df5d75-cf06-4856-a9cf-c3e8fba7f6b1'`, `event_code = 'BASEBA18'`, and `event_name = 'BASE BA18 Seed Event'`. This event is accessible by any test user who has the necessary RBAC scope for the dev-db organisation.

**Seeded registration types**

6. F-06 — After a successful seed run, `base_registration_type` contains two rows scoped to the BASEBA18 event:
   - "BA18 Seed Standard" — `cost = 0`, `capacity = null` (unlimited), `is_active = true`; no approval requirements.
   - "BA18 Seed Guardian Review" — `cost = 0`, `capacity = null`, `is_active = true`; has at least one `guardian_approval` requirement configured in `base_registration_type_requirement`.

**Seeded registration form and binding**

7. F-07 — After a successful seed run, `core_forms` contains a row with `id = '2d3d91f9-1e25-4ffc-8f8b-c654ff3cfd9e'`, `name = 'BA18 Seed Registration Form'`, `slug = 'ba18-seed-registration'`, `status = 'published'`, `workflow_type = 'base_registration'`, `access_mode = 'authenticated_member'`, `is_primary_entrypoint = true`, and `workflow_config = '{"pre_submission_checks":["profile_complete"]}'`, scoped to the BASEBA18 event. The `workflow_config` pre-submission gate is relevant to BA05a verification.
8. F-08 — `base_form_registration_type` contains two binding rows linking the seed form to both seeded registration types, making the form an open-selection entrypoint (the applicant chooses a registration type at submission).
9. F-09 — `core_form_fields` contains one field row for the seed form, referenced by `field_key`.

**Seeded applications**

10. F-10 — After a successful seed run, `base_application` contains exactly four rows for the BASEBA18 event, one in each of the following statuses: `submitted`, `under_review`, `approved`, `rejected`. Each application has a valid `registration_type_id` pointing to one of the two seeded registration types.

**Seeded application check**

11. F-11 — After a successful seed run, `base_application_check` contains one row in `pending` status, anchored to the `under_review` application. This row represents an unresolved guardian-approval check and is required for BA06 check-level detail QA.

**Seeded persons and members**

12. F-12 — After a successful seed run, `core_person` contains four seed rows — one per application status — with deterministic UUIDs and email addresses of the form `ba18.<status>.seed@example.invalid`. These rows are prerequisites for the `base_application.person_id` FK and are also idempotently upserted by the RPC.

13. F-13 — After a successful seed run, `core_member` contains four seed rows linked to the seed persons above, with `membership_number` values `BA18-SUBMITTED`, `BA18-UNDER-REVIEW`, `BA18-APPROVED`, and `BA18-REJECTED`. These give each seed application a valid member context for BA02/BA03/BA05a QA.

**Production execution prohibition**

14. F-14 — No invocation path for `app_base_seed_reset_dev` is documented, scripted, or callable against a production database. The RPC is defined in dev-db only. Any attempt to call it on a production project must fail at the database level (RPC does not exist there).

**Downstream verification readiness**

15. F-15 — After a successful seed run, a QA operator can open any BASE admin route that depends on applications (e.g. the applications list at `/applications`) with the BASEBA18 event selected in the shell and observe a non-empty list backed by the seeded rows. No route-local hardcoded records are used.

---

## 5. Visual specification

Not applicable. BA18 is backend seed/reset execution with no UI surface.

## 6. Business rules

### BR-01 — Production execution prohibition

| Input | Rule | Output |
|-------|------|--------|
| Any invocation target | The seed/reset RPC exists only in dev/staging Supabase projects. | Invocation against production fails because the function does not exist there. |
| Any scripted or manual seed invocation | No script, CI step, or documented process points `app_base_seed_reset_dev` at a production project URL or key. | No production seed path exists. |

### BR-02 — RPC access control

| Caller | EXECUTE granted? | Function body passes? | Outcome |
|--------|-----------------|----------------------|---------|
| `anon` role | No | N/A | Postgres rejects the call before the function body runs |
| `authenticated` user, not super_admin | Yes (grant exists) | No — `is_super_admin()` returns false | Function body raises an error; call fails |
| `authenticated` user, is super_admin | Yes | Yes | Seed executes |
| `service_role` | Yes | Yes — `is_service_role()` returns true | Seed executes |

### BR-03 — Idempotency / upsert-on-conflict

The RPC achieves idempotency via upsert: every `INSERT` statement uses `ON CONFLICT (id) DO UPDATE`, which updates the prior row in place with the same values rather than inserting a duplicate or raising a constraint error. No rows are deleted or truncated. The execution order is:

1. Upsert the seed event into `core_events`.
2. Upsert the two registration types into `base_registration_type`.
3. Upsert the guardian-approval requirement into `base_registration_type_requirement`.
4. Upsert the seed form into `core_forms`, then the form field into `core_form_fields`, then the two bindings into `base_form_registration_type`.
5. Upsert the four seed persons into `core_person`, then the four seed members into `core_member`.
6. Upsert the four seed applications into `base_application`.
7. Upsert the pending check into `base_application_check`.
8. Return the jsonb execution summary.

On a second invocation with no intervening changes, the output state is identical to the first invocation. No duplicate-key or constraint errors are raised.

### BR-04 — Approved execution path

The only approved mechanism for seeding BASE dev/staging data is calling `app_base_seed_reset_dev`. Raw SQL inserts that replicate the seed rows outside the RPC are not an approved substitute. App-bundled fixture rows inside shipping product route code are prohibited (see BR-06).

### BR-05 — Stable identifier contract

The following identifiers are deterministic and stable across seed runs. QA test packs must use these as primary references:

| Identifier | Value | Discovery handle |
|------------|-------|-----------------|
| Seed event UUID | `d2df5d75-cf06-4856-a9cf-c3e8fba7f6b1` | `SELECT event_id FROM core_events WHERE event_code = 'BASEBA18'` |
| Seed event code | `BASEBA18` | Human-readable; use to discover the UUID in any environment |
| Seed event name | `BASE BA18 Seed Event` | Display name |
| Seed form UUID | `2d3d91f9-1e25-4ffc-8f8b-c654ff3cfd9e` | `SELECT id FROM core_forms WHERE event_id = '<seed_event_id>' AND workflow_type = 'base_registration'` |
| Seed form name | `BA18 Seed Registration Form` | Display name |

If a QA pack or test script must reference a specific application UUID, it must discover it dynamically by querying `base_application WHERE event_id = '<seed_event_id>' AND status = '<target_status>'` rather than hardcoding an application UUID.

### BR-06 — No app-bundled fixtures

Shipping BASE product route code must never include hardcoded domain entity rows (e.g. a hard-coded array of applications, registration types, or scan points). Loading, empty, and error states are valid outcomes when no seed data has been run. The seed workflow — not the product route — is responsible for non-empty QA state.

### BR-07 — Downstream table scope

BA18 seed coverage is scoped to the registration, application, and forms domains only. The following tables are explicitly out of scope for the BA18 seed contract:

- `base_units`, `base_unit_role_types`, `base_unit_roles` — owned by BA08 QA setup
- `base_activity_offering`, `base_activity_session`, `base_activity_booking`, `base_activity_preference` — owned by BA09/BA10/BA11 QA setup
- `base_consent` — owned by BA05a/BA10 QA setup
- `base_scan_point`, `base_scan_event` — owned by BA12/BA13 QA setup

Downstream slice QA packs that require data in these tables are responsible for documenting their own data setup, either via a supplemental seed step or via test-pack-specific instructions.

---

## 7. API / Contract

### Seed/reset RPC

**Name:** `app_base_seed_reset_dev`

**Schema:** `public`

**Signature:**
```sql
app_base_seed_reset_dev(
  p_organisation_id  uuid,   -- nullable; the organisation_id context for seeded rows (see note)
  p_actor            uuid    -- nullable; the auth.users id of the calling super_admin (coalesces to auth.uid())
) RETURNS jsonb
```

**Parameter notes:**

- `p_organisation_id` — nullable. If `null`, the RPC resolves the organisation_id by falling back to the most recently created `core_events.organisation_id`, then `core_member.organisation_id`. Pass an explicit value in all scripted invocations to avoid non-deterministic org resolution. The resolved org_id is reflected in the return value.
- `p_actor` — nullable. If `null`, the RPC coalesces to `auth.uid()`. For service-role calls `auth.uid()` returns null, which is accepted; the actor is used for `created_by`/`updated_by` audit columns on seed rows.

**Return:** A jsonb object confirming seed completion. On failure, the RPC raises a Postgres exception — it does not return a jsonb error key. Callers must treat any raised exception as a blocker and record the exception message before proceeding with downstream QA.

**Return shape (success):**
```json
{
  "event_id": "d2df5d75-cf06-4856-a9cf-c3e8fba7f6b1",
  "organisation_id": "<the resolved organisation uuid>",
  "form_id": "2d3d91f9-1e25-4ffc-8f8b-c654ff3cfd9e",
  "applications_seeded": 4,
  "checks_seeded": 1,
  "registration_bindings_seeded": 2
}
```

**Access grants:**

| Postgres role | EXECUTE granted | Effective access |
|---------------|----------------|-----------------|
| `anon` | No | Rejected at grant level |
| `authenticated` | Yes | Body guard: `is_super_admin()` required; ordinary authenticated users are rejected |
| `service_role` | Yes | Body guard: `is_service_role()` passes; seed executes |
| `postgres` | Yes | Superuser — passes |

**Cross-slice handoff:** BA18 is the authoritative seed-data source for BA02, BA03, BA04, BA05a, BA05b, BA06, BA07, and BA17 non-empty QA verification. Those slices' QA packs reference the stable identifiers in BR-05 to locate seeded data, not to define their own fixture rows.

---

## 8. Data and schema references

### Schema prerequisite

All 16 BASE tables and the `app_base_seed_reset_dev` RPC must exist in the target dev-db before BA18 execution can proceed. The canonical schema is defined in `docs/database/domains/base.md`. Migration `20260428100259_ba18_seed_reset_contract` is the authoritative source for the RPC implementation.

To confirm readiness, run the following MCP verification sequence against dev-db project `rkytnffgmwnnmewevqgp`:

```sql
-- 1. Confirm all required BASE tables are present
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'base_registration_type','base_registration_type_eligibility',
    'base_registration_type_requirement','base_application',
    'base_application_check','base_form_registration_type',
    'base_units','base_unit_role_types','base_unit_roles',
    'base_activity_offering','base_activity_session',
    'base_activity_booking','base_activity_preference',
    'base_consent','base_scan_point','base_scan_event'
  )
ORDER BY table_name;
-- Expected: 16 rows

-- 2. Confirm RPC exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'app_base_seed_reset_dev';
-- Expected: 1 row

-- 3. Confirm anon is NOT granted EXECUTE
SELECT grantee FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'app_base_seed_reset_dev'
  AND grantee = 'anon';
-- Expected: 0 rows

-- 4. Confirm an active BASE app row exists in rbac_apps (required by RPC to resolve owner_app_id)
SELECT id FROM rbac_apps WHERE name = 'BASE' AND is_active = true LIMIT 1;
-- Expected: 1 row
```

### Tables seeded by BA18

| Table | Purpose in seed | Seeded rows |
|-------|----------------|-------------|
| `core_events` | Seed event anchor — created by the RPC via upsert (`ON CONFLICT (event_id) DO UPDATE`). No prior event creation required. | 1 (`BASEBA18`) |
| `base_registration_type` | Two registration categories for BASEBA18 | 2 |
| `base_registration_type_requirement` | Guardian-approval requirement for "BA18 Seed Guardian Review" type | 1 |
| `core_forms` | Registration entrypoint form | 1 |
| `core_form_fields` | One field for the seed form | 1 |
| `base_form_registration_type` | Binds the form to both registration types | 2 |
| `core_person` | One seed person per application status (required by `base_application.person_id` FK) | 4 |
| `core_member` | One seed member per seed person, giving each application a valid member context | 4 |
| `base_application` | One application per status: `submitted`, `under_review`, `approved`, `rejected` | 4 |
| `base_application_check` | Pending guardian-approval check on the `under_review` application | 1 |

### Relevant schema columns (key fields for post-seed verification)

**`base_application`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `event_id` | uuid | FK → `core_events`; seed rows use BASEBA18 event_id |
| `registration_type_id` | uuid | NOT NULL FK → `base_registration_type` |
| `status` | text | `draft` \| `submitted` \| `under_review` \| `approved` \| `rejected` \| `withdrawn` |
| `person_id` | uuid | FK → `core_person` |
| `form_id` | uuid | FK → `core_forms`; the form used to submit the application |
| `organisation_id` | uuid | FK → `core_organisations` |

**`core_forms`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `slug` | text | `'ba18-seed-registration'` — used for portal form resolution by slug |
| `status` | text | `'published'` — the seed form is live for registration |
| `workflow_type` | text | `'base_registration'` for seed form |
| `access_mode` | text | `'authenticated_member'` for seed form |
| `is_primary_entrypoint` | boolean | `true` for seed form |
| `workflow_config` | jsonb | `'{"pre_submission_checks":["profile_complete"]}'` — pre-submission gate; relevant to BA05a |
| `event_id` | uuid | FK → `core_events` |

**`core_form_fields`**

| Column | Type | Notes |
|--------|------|-------|
| `form_id` | uuid | FK → `core_forms` |
| `field_key` | text | NOT NULL; the semantic field identity column. `table_name` and `column_name` do not exist in the current BASE schema — `field_key` is the only field identity contract. |

**`core_person`** (seeded by BA18 as person context for each application)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK; stable deterministic UUID per status (see BR-05) |
| `first_name` | text | `'BA18'` for all seed persons |
| `last_name` | text | Status name (e.g. `'Submitted'`, `'UnderReview'`) |
| `email` | text | `ba18.<status>.seed@example.invalid` pattern |

**`core_member`** (seeded by BA18 as member context for each application)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK; stable deterministic UUID per status (see BR-05) |
| `person_id` | uuid | FK → `core_person`; links to the matching seed person |
| `organisation_id` | uuid | The organisation resolved from `p_organisation_id` |
| `membership_number` | text | `BA18-SUBMITTED`, `BA18-UNDER-REVIEW`, `BA18-APPROVED`, `BA18-REJECTED` |
| `membership_status` | text | `'Provisional'` for all seed members |

### Domain reference docs

- `docs/database/domains/base.md` — authoritative BASE schema, BA18 seed contract identifiers, row counts, RPC access contract
- `docs/database/domains/base.md` § "BA18 seed/reset identifiers (implementation-ready)" — stable UUIDs and coverage anchors
- `BASE-architecture.md` § "Database and Supabase MCP workflow (AI execution)" — MCP inspection/verification sequence

---

## 9. pace-core2 imports

### 9.1 Required symbols actually used in this slice

| Symbol | Import policy | Why used in BA18 |
|---|---|---|
| _None in BASE app_ | Root-first policy applies; no pace-core import required in this slice | BA18 executes RPC-based seed verification only |

### 9.2 Slice-specific caveats only

- Approved execution path is `app_base_seed_reset_dev` plus verification SQL checks.
- Outputs are MCP/SQL evidence artifacts, not UI implementation artifacts.
- Import style in this slice follows root-first policy even though no pace-core symbols are consumed.

## 10. Permission and access rules

BA18 has no page-level guards and no route-level permissions. Access control is enforced at the RPC level in the database.

### RPC access matrix

| Actor | Can call `app_base_seed_reset_dev`? | Enforcement mechanism |
|-------|-------------------------------------|----------------------|
| `anon` Postgres role | No | EXECUTE not granted; rejected at Postgres grant level |
| Authenticated user — not super_admin | No | EXECUTE granted to `authenticated` role, but function body enforces `is_super_admin(safe_get_user_id_for_rls())` and rejects non-super-admins |
| Authenticated user — is super_admin | Yes | Passes body guard |
| Service-role client | Yes | `is_service_role()` passes body guard |

No page permission guards, RBAC resource checks, or `PagePermissionGuard` configurations are required for this slice.

---

## 11. Acceptance criteria

- [ ] **AC-01 (happy path — clean run):** Given a dev-db with all 16 BASE tables and the `app_base_seed_reset_dev` RPC present, when a service-role client calls `app_base_seed_reset_dev(p_organisation_id, p_actor)`, then the call returns without error, returns a jsonb result, and post-run queries confirm all rows in the seeded tables (F-05 through F-13).

- [ ] **AC-02 (idempotency):** Given a dev-db where `app_base_seed_reset_dev` has already been called once and the seeded rows are present, when the same call is made a second time with no intervening data changes, then no duplicate-key or constraint error is raised and the post-run state is identical to the post-first-run state.

- [ ] **AC-03 (anon rejection):** Given a dev-db with `app_base_seed_reset_dev` present, when an `anon` role client attempts to call the RPC, then Postgres rejects the call with a permission denied error before the function body executes.

- [ ] **AC-04 (non-super-admin authenticated rejection):** Given a dev-db with `app_base_seed_reset_dev` present, when an authenticated user who is not a super_admin calls the RPC, then the function body rejects the call with an error and no seed rows are inserted or modified.

- [ ] **AC-05 (seed event exists):** Given a completed seed run, when a query is executed for `SELECT event_id FROM core_events WHERE event_code = 'BASEBA18'`, then the result is exactly one row with `event_id = 'd2df5d75-cf06-4856-a9cf-c3e8fba7f6b1'`.

- [ ] **AC-06 (registration types seeded):** Given a completed seed run, when `base_registration_type` is queried for `event_id = 'd2df5d75-cf06-4856-a9cf-c3e8fba7f6b1'`, then exactly two active rows are returned: "BA18 Seed Standard" and "BA18 Seed Guardian Review", both with `cost = 0` and `capacity = null`.

- [ ] **AC-07 (form and bindings seeded):** Given a completed seed run, when `core_forms` is queried for the BASEBA18 event_id, then one row is returned with `workflow_type = 'base_registration'`, `access_mode = 'authenticated_member'`, and `is_primary_entrypoint = true`. When `base_form_registration_type` is queried for that form_id, two binding rows are returned.

- [ ] **AC-08 (applications seeded):** Given a completed seed run, when `base_application` is queried for the BASEBA18 event_id grouped by status, then exactly four groups are returned: one `submitted`, one `under_review`, one `approved`, one `rejected`.

- [ ] **AC-09 (application check seeded):** Given a completed seed run, when `base_application_check` is joined to `base_application` and filtered to the BASEBA18 event_id, then one `pending` check row is returned, anchored to the `under_review` application.

- [ ] **AC-10 (downstream route smoke check):** Given a completed seed run and a test user with appropriate BASE organiser scope selecting the BASEBA18 event in the BASE shell, when the user navigates to `/applications`, then the applications list renders with at least one non-empty row (backed by the seeded applications, not by hardcoded fixture records in the route).

- [ ] **AC-11 (guardian approval requirement seeded):** Given a completed seed run, when `base_registration_type_requirement` is queried joined to `base_registration_type` and filtered to the BASEBA18 event_id and the "BA18 Seed Guardian Review" type, then exactly one row is returned with `check_type = 'guardian_approval'` and `id = 'f80cf10b-8ad6-4935-b319-e412f4d96757'`.

---

## 12. Verification

- Verify schema readiness and RPC presence before execution.
- Execute `app_base_seed_reset_dev` with approved credentials and inspect return payload.
- Verify post-seed counts/identifiers for event, registration types, forms, applications, checks, and bindings.
- Verify idempotent re-run stability with no constraint failures.
- Verify access controls (`anon` denied, non-super-admin denied).
- Verify downstream smoke state for non-empty `/applications` with seeded event.

## 13. Testing requirements

- Scripted checks cover seed happy path counts across seeded tables.
- Scripted checks cover idempotent re-run behaviour.
- Access-control checks verify execute restrictions for unauthorized roles.
- Readiness checks ensure required tables/RPC exist pre-run.

## 14. Build execution rules

- No schema changes are allowed in BA18 execution.
- Use only `app_base_seed_reset_dev`; do not substitute manual insert scripts.
- Stop and record blockers on readiness or execution failures.
- Do not patch route fixtures to compensate for failed seeding.

## 15. Done criteria

- Seed RPC execution and all §12 verification checks are completed successfully.
- Idempotency and access-control checks pass.
- Downstream smoke check confirms seeded data usability.
- Evidence is recorded in delivery/backend-ready artifacts.

## 16. Do not

- Do not execute BA18 seeding against production environments.
- Do not call seed RPC with unauthorized roles.
- Do not replace RPC seed flow with raw SQL inserts.
- Do not expand seed scope without updating slice/domain contracts.
- Do not mark done without SQL-backed verification evidence.

## 17. References

- `docs/requirements/BASE-project-brief.md`
- `docs/requirements/BASE-architecture.md`
- `docs/delivery/base-build-queue.md`

## 18. Implementing Agent Instructions

- BA18 implementation is verification execution, not frontend coding.
- Stop and file blockers for any mismatch before downstream reruns.
