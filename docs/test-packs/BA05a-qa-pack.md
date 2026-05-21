# BA05a QA Pack

## Slice metadata

- slice_id: BA05a
- app: pace-base2
- requirement_path: docs/requirements/BA05a-registration-entry-and-application-submission-requirements.md

## Manual frontend scenarios

| scenario_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 / AC-01 | /pace-core | a registration type with no requirements | 1) Open `/pace-core`. 2) Create RPC succeeds. 3) Observe the resulting UI/system response. | base_application.status = 'approved' and no base_application_check rows exist for that application | Pass/Fail | - |
| S-02 / AC-02 | /pace-core | a type with ordered requirements | 1) Open `/pace-core`. 2) Create succeeds, then: base_application.status = 'under_review'; one base_application_check row exists per requirement, all with status = 'pending'; the row with the lowest sort_order has a non-null token_hash and future token_expires_at when the first check type is guardian_approval or referee; and rows with higher sort_order have null token_hash and null token_expires_at. 3) Observe the resulting UI/system response. | : base_application.status = 'under_review'; one base_application_check row exists per requirement, all with status = 'pending'; the row with the lowest sort_order has a non-null token_hash and future token_expires_at when the first check type is guardian_approval or referee; and rows with higher sort_order have null token_hash and null token_expires_at | Pass/Fail | - |
| S-03 / AC-03 | /pace-core | eligibility failure | 1) Open `/pace-core`. 2) Create is invoked. 3) Observe the resulting UI/system response. | the exception class is base_application_eligibility_failed — not base_application_scope_denied | Pass/Fail | - |
| S-04 / AC-04 | /pace-core | optional carer omitted | 1) Open `/pace-core`. 2) Create succeeds. 3) Observe the resulting UI/system response. | carer_person_id is null; given valid distinct carer, then carer_person_id is persisted | Pass/Fail | - |
| S-05 / AC-05 | /pace-core | a referee requirement type | 1) Open `/pace-core`. 2) Submit omits p_referee_person_id. 3) Observe the resulting UI/system response. | create raises base_application_referee_required; when submit supplies an ineligible person id, then create raises base_application_referee_ineligible | Pass/Fail | - |
| S-06 / AC-06 | /pace-core | pre_submission_checks entries | 1) Open `/pace-core`. 2) Portal submits snapshots via p_consents. 3) Observe the resulting UI/system response. | matching base_consent rows exist with non-null verbatim_text and null booking_id | Pass/Fail | - |
| S-07 / AC-07 | /pace-core | eligible org fixture data, referee RPC returns only persons who are core_member of an ancestor organisation of the applicant's org, are non-deleted, and are not the applicant | 1) Open `/pace-core`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given eligible org fixture data, referee RPC returns only persons who are core_member of an ancestor organisation of the applicant's org, are non-deleted, and are not the applicant. | Pass/Fail | - |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: -
- defect links: N/A
- retest needed: [Yes/No]
