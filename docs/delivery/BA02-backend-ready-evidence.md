# BA02 Backend-Ready Evidence

## Slice

- Requirement: `docs/requirements/BA02-shared-forms-platform-contracts-requirements.md`
- Date: 2026-05-03
- Scope type: verification-only (no UI/DDL/RLS implementation work)
- Supabase project ref verified: `rkytnffgmwnnmewevqgp`

## Contract test evidence

- Added test suite: `src/shared-forms-contracts.test.ts`
- Command:
  - `npm run test -- src/shared-forms-contracts.test.ts`
- Result:
  - 1 file passed, 7 tests passed
- Verifies:
  - CR21 exports from `@solvera/pace-core/forms`
  - `validateWorkflowAuthoringState` contracts used by BA02 ACs
  - `buildWorkflowPreviewTarget` primary registration path contract
  - `buildWorkflowSubmissionPayload` `fieldKey`-keyed payload shape

## Schema verification evidence (BA02 section 8 SQL)

All queries executed with Supabase MCP `execute_sql` against `rkytnffgmwnnmewevqgp`.

### Q1 - required tables present, dropped tables absent

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'core_forms', 'core_form_fields', 'core_form_responses',
  'core_form_response_values', 'base_form_registration_type',
  'core_form_context_types', 'core_form_field_config'
)
ORDER BY table_name;
```

Result:
- Present: `base_form_registration_type`, `core_form_fields`, `core_form_response_values`, `core_form_responses`, `core_forms`
- Absent: `core_form_context_types`, `core_form_field_config`

### Q2 - `core_forms` new columns present

Result:
- `access_mode`
- `is_primary_entrypoint`
- `owner_app_id`
- `title`
- `workflow_config`
- `workflow_type`

### Q3 - `core_forms` legacy columns absent

Result:
- no rows returned

### Q4 - `core_form_fields.field_key` present, `table_name`/`column_name` absent

Result:
- `field_key` only

### Q5 - `core_form_responses` workflow subject columns present, legacy target columns absent

Result:
- `workflow_subject_id`
- `workflow_subject_type`

### Q6 - `core_form_response_values.field_key` present, `table_name`/`column_name` absent

Result:
- `field_key` only

### Q7 - `base_form_registration_type` column shape

Result:
- `id`
- `form_id`
- `registration_type_id`
- `event_id`
- `organisation_id`
- `sort_order`
- `is_default`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`

### Q8 - unique constraint on `(form_id, registration_type_id)`

Result:
- `base_form_registration_type_form_registration_unique` -> `UNIQUE (form_id, registration_type_id)`

### Q9 - `is_primary_entrypoint` index coverage

Result:
- `core_forms_primary_registration_per_event_unique`
- Definition:
  - unique on `event_id`
  - predicate includes:
    - `workflow_type = 'base_registration'`
    - `is_primary_entrypoint = true`
    - `COALESCE(is_active, true) = true`
    - `status = 'published'`
    - `event_id IS NOT NULL`

### Q10 - fixed-type and open-selection binding-count evidence

Query:
```sql
SELECT form_id, COUNT(*)::int AS binding_count
FROM base_form_registration_type
GROUP BY form_id
HAVING COUNT(*) IN (1, 2)
ORDER BY binding_count, form_id
LIMIT 10;
```

Result sample:
- `5f3ce6b4-d29e-4c12-b601-b5fdbebb0e11` -> `1` binding (fixed-type case)
- `2d3d91f9-1e25-4ffc-8f8b-c654ff3cfd9e` -> `2` bindings (open-selection case)

## AC traceability

| AC | Verification source | Outcome |
|---|---|---|
| AC-01 | `src/shared-forms-contracts.test.ts` (`invalid_workflow_type` assertion) | Pass |
| AC-02 | `src/shared-forms-contracts.test.ts` (`duplicate_field_key` assertion) | Pass |
| AC-03 | `src/shared-forms-contracts.test.ts` (`activation_blocked` assertion) | Pass |
| AC-04 | BA02 decision-table contract in requirement section 6.8; runtime UI enforcement delegated to BA05a/BA10 by BA02 design | Contract recorded (deferred runtime verification) |
| AC-05 | BA02 decision-table contract in requirement section 6.8; runtime UI enforcement delegated to BA05a/BA10 by BA02 design | Contract recorded (deferred runtime verification) |
| AC-06 | Q2 schema SQL result (`core_forms` required columns) | Pass |
| AC-07 | Q3/Q4/Q5/Q6 schema SQL results (legacy columns absent) | Pass |
| AC-08 | Q1 schema SQL result (dropped tables absent) | Pass |
| AC-09 | `src/shared-forms-contracts.test.ts` import/export resolution assertions | Pass |
| AC-10 | `src/shared-forms-contracts.test.ts` payload shape assertion (`fieldKey` only) | Pass |
| AC-11 | Q10 binding-count query result sample (`1` and `2` binding cases) | Pass |
| AC-12 | `src/shared-forms-contracts.test.ts` (`invalid_workflow_access_combination`) | Pass |
| AC-13 | `src/shared-forms-contracts.test.ts` (`invalid_entrypoint`) | Pass |
| AC-14 | `src/shared-forms-contracts.test.ts` (`/camp-alpha/application`, `base_primary_entrypoint`) | Pass |

## Verification command evidence

- `npm run test -- src/shared-forms-contracts.test.ts` -> pass
- `npm run type-check` -> pass

## Blockers

- None.
- Upstream blocker state remains clear for this verification run:
  - taxonomy validation rejects invalid workflow types
  - fixed/open-selection binding-count evidence is present in dev DB

## Current BA02 status

- **Status:** Backend-ready (unblocked).
- **Ready for downstream consumption:** yes; BA02 contract verification is complete for current run.
