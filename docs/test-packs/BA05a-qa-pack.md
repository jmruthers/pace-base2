# BA05a QA Pack

## Slice metadata

- slice_id: BA05a
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA05a-registration-entry-and-application-submission-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | FS-02 | Participant registration entrypoint | Open a `base_registration` form with multiple `base_form_registration_type` bindings. | Registration type selection is required before submit for open-selection entrypoints. |  |  |
| S-02 | FS-03, FS-04 | Registration submit flow | Submit a valid registration and inspect resulting linked records. | Form response capture is created and linked to the created `base_application` as workflow subject. |  |  |
| S-03 | FS-11, AC-04 | Registration submit flow (carer) | Submit once without carer and once with a valid distinct carer. | Carer is optional when omitted; valid distinct carer persists successfully. |  |  |
| S-04 | FS-12, AC-05 | Referee-required registration flow | Submit a referee-required type once without referee and once with ineligible referee. | Missing referee triggers required-path failure; ineligible referee triggers ineligible-path failure. |  |  |
| S-05 | FS-07, AC-01, AC-02 | Registration submit flow (status derivation) | Submit one type without requirements and one with requirements. | Requirement-free type starts approved with no checks; requirement-backed type starts under_review with pending check rows. |  |  |
| S-06 | FS-13, FS-14, AC-06 | Pre-submission checks / consent capture | Complete required pre-submission checks and submit with consent payload. | Consent snapshots are created with non-null verbatim text for provided consent entries. |  |  |
| S-07 | FS-05, FS-06, AC-03 | Registration submit flow (scope vs eligibility) | Execute one submission blocked by scope and one blocked by eligibility rules. | Scope denial and eligibility failure remain distinct failure outcomes. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
