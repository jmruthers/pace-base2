# BA02 Backend-Ready Evidence

## Scope

This evidence log maps BA02 acceptance criteria in `docs/requirements/BA02-shared-forms-platform-contracts-requirements.md` to verification proof in the BASE app.

## Automated Contract Evidence

Primary test file:

- `src/shared-forms-contracts.test.ts`

Acceptance criteria covered by automated assertions:

- **AC-01**: invalid workflow taxonomy rejected (`invalid_workflow_type`)
- **AC-02**: duplicate `fieldKey` rejected (`duplicate_field_key`)
- **AC-03**: invalid active form is blocked (`activation_blocked`)
- **AC-04**: time-window resolves `not_yet_open` when `opens_at` is in the future
- **AC-05**: time-window resolves `closed` when `closes_at` is in the past
- **AC-09**: required CR21 exports resolve from `@solvera/pace-core/forms`
- **AC-10**: submission payload values are `fieldKey`-keyed, with no `table_name`/`column_name`
- **AC-12**: `org_signup` + `public` access mode rejected
- **AC-13**: invalid primary-entrypoint workflow rejected (`invalid_entrypoint`)
- **AC-14**: preview target resolves to `/camp-alpha/application` with `base_primary_entrypoint`

Additional quality checks:

- `npm run test`
- `npm run validate`

## Schema Verification SQL (Dev DB)

BA02 requires schema checks against dev-db project `rkytnffgmwnnmewevqgp`.

Queries to run (from BA02 §8):

- table existence / dropped-table absence checks
- `core_forms` required/removed column checks
- `core_form_fields` / `core_form_response_values` field identity checks
- `core_form_responses` workflow subject column checks
- `base_form_registration_type` shape and unique constraints
- partial unique index checks for primary entrypoint

Current status in this evidence artifact:

- **AC-06, AC-07, AC-08, AC-11**: require SQL-backed verification output capture from the BA02 §8 queries.

## Summary

BA02 contract tests are in place and now include explicit time-window and isolated validation coverage. Backend-ready completion requires attaching SQL result evidence for the schema-specific acceptance criteria listed above.
