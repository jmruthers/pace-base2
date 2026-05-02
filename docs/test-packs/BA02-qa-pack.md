# BA02 QA Pack

## Slice metadata

- slice_id: BA02
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA02-shared-forms-platform-contracts-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | C-19, C-22 | Forms authoring host surface | Open authoring shell with invalid workflow state (for example duplicate active `field_key`). | Validation summary indicates invalid state and save action remains blocked. |  |  |
| S-02 | C-01, C-22 | Forms authoring host surface | Attempt to set workflow type outside the approved taxonomy. | Validation rejects the invalid workflow type before activation. |  |  |
| S-03 | C-21, C-10 | Forms authoring host surface | Build a submission payload from authored fields and inspect emitted values. | Payload values are keyed by `field_key` only and do not include table/column semantics. |  |  |
| S-04 | C-23, AC-14 | Preview target panel | Set `workflowType='base_registration'` with `isPrimaryEntrypoint=true` and provide event slug. | Preview target resolves to `/{eventSlug}/application` with expected primary-entrypoint behavior. |  |  |
| S-05 | C-24, C-26 | BASE registration form authoring context | Configure a `base_registration` form and verify registration bindings are sourced from `base_form_registration_type`. | Registration form contract uses the binding model defined for `base_registration` forms. |  |  |
| S-06 | C-04 | BASE form metadata editor | Configure access mode for BASE-scoped form authoring and validate allowed choices. | BASE authoring allows only `public` and `authenticated_member` access modes. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
