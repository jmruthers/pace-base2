# BA05a QA Pack

## Slice metadata

- slice_id: BA05a
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA05a-registration-entry-and-application-submission-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | FS-02 | Participant registration entry (form with multiple bindings) | Open registration flow for a form with multiple registration type bindings and progress toward submit. | Registration type selection is required before submit for multi-binding forms. |  |  |
| S-02 | FS-18 | Participant registration form render surface | Open registration form in participant flow. | Shared `WorkflowFormRenderer` contract is used for form rendering. |  |  |
| S-03 | FS-19, FS-14, AC-06 | Pre-submit checks section | Complete configured pre-submission checks and submit with required consent payload. | Submission succeeds with consent snapshot behavior aligned to requirement refs. |  |  |
| S-04 | FS-12, BR-05, BR-09, AC-05 | Referee-required registration submit flow | Select eligible referee via required eligibility source and submit. | Submission succeeds and required referee handling path is satisfied. |  |  |
| S-05 | FS-12, AC-05 | Referee-required registration submit flow | Attempt submit without required referee and then with ineligible referee id. | Validation/error handling follows required referee-required and ineligible paths. |  |  |
| S-06 | FS-11, BR-04, AC-04 | Optional carer section in registration submit flow | Submit once without carer and once with valid distinct carer. | Omitted carer remains optional; valid carer path persists correctly per requirement behavior. |  |  |
| S-07 | BR-02, AC-03, FS-05, FS-06 | Registration submit flow (scope vs eligibility cases) | Execute one scope-denied case and one eligibility-failed case. | Scope and eligibility failures remain distinct handling paths. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
