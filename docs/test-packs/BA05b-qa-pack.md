# BA05b QA Pack

## Slice metadata

- slice_id: BA05b
- app: pace-base2
- requirement_path: docs/requirements/BA05b-participant-application-progress-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|---|
| S-01 | AC-01 | /pace-core | an authenticated applicant for application A | 1) Open `/pace-core`. 2) The RPC is called with A's id. 3) Observe the resulting UI/system response. | response matches §7.2 shape and checks sort order matches requirement sort_order ascending | Pass/Fail | - |
| S-02 | AC-02 | /pace-core | the same caller | 1) Open `/pace-core`. 2) Checks[].status is read from a row with each allowed DB status in fixtures. 3) Observe the resulting UI/system response. | returned strings equal pending, satisfied, failed, waived respectively with no transformation | Pass/Fail | - |
| S-03 | AC-03 | /pace-core | a successful payload | 1) Open `/pace-core`. 2) The JSON is inspected. 3) Observe the resulting UI/system response. | keys listed in §6.4 are absent from the serialised object; specifically referee_person_id and carer_person_id are absent and referee_name is present (string or null) | Pass/Fail | - |
| S-04 | AC-04 | /pace-core | an authenticated user who is not the applicant | 1) Open `/pace-core`. 2) The RPC is called for that application id. 3) Observe the resulting UI/system response. | the call raises base_application_access_denied (§6.5) | Pass/Fail | - |
| S-05 | AC-05 | /pace-core | an application with no check rows | 1) Open `/pace-core`. 2) The applicant calls the RPC. 3) Observe the resulting UI/system response. | checks is [] and application is still populated | Pass/Fail | - |
| S-06 | AC-06 | /pace-core | each check_type in §6.3 present in seed data | 1) Open `/pace-core`. 2) The RPC returns those rows. 3) Observe the resulting UI/system response. | participant_check_label matches the §6.3 table exactly | Pass/Fail | - |
| S-07 | AC-07 | /pace-core | application.status is under_review | 1) Open `/pace-core`. 2) The applicant loads the portal progress page (integration / QA). 3) Observe the resulting UI/system response. | UI displays the literal under_review string from payload without mapping | Pass/Fail | - |
| S-08 | AC-08 | /pace-core | an application with a non-null referee_person_id (requires BA05a migration) | 1) Open `/pace-core`. 2) The RPC returns the payload. 3) Observe the resulting UI/system response. | application.referee_name is a non-null string matching COALESCE(preferred_name, first_name) \|\| ' ' \|\| last_name from core_person; referee_person_id is absent from the serialised output | Pass/Fail | - |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: -
- defect links: N/A
- retest needed: [Yes/No]
