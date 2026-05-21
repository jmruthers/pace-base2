# BA18 QA Pack

## Slice metadata

- slice_id: BA18
- app: pace-base2
- requirement_path: docs/requirements/BA18-base-dev-seed-data-requirements.md

## Manual frontend scenarios

| scenario_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 / AC-01 | /staging | a dev-db with all 16 BASE tables and the app_base_seed_reset_dev RPC present | 1) Open `/staging`. 2) A service-role client calls app_base_seed_reset_dev(p_organisation_id, p_actor). 3) Observe the resulting UI/system response. | the call returns without error, returns a jsonb result, and post-run queries confirm all rows in the seeded tables (F-05 through F-13) | Pass/Fail | - |
| S-02 / AC-02 | /staging | a dev-db where app_base_seed_reset_dev has already been called once and the seeded rows are present | 1) Open `/staging`. 2) The same call is made a second time with no intervening data changes. 3) Observe the resulting UI/system response. | no duplicate-key or constraint error is raised and the post-run state is identical to the post-first-run state | Pass/Fail | - |
| S-03 / AC-03 | /staging | a dev-db with app_base_seed_reset_dev present | 1) Open `/staging`. 2) An anon role client attempts to call the RPC. 3) Observe the resulting UI/system response. | Postgres rejects the call with a permission denied error before the function body executes | Pass/Fail | - |
| S-04 / AC-04 | /staging | a dev-db with app_base_seed_reset_dev present | 1) Open `/staging`. 2) An authenticated user who is not a super_admin calls the RPC. 3) Observe the resulting UI/system response. | the function body rejects the call with an error and no seed rows are inserted or modified | Pass/Fail | - |
| S-05 / AC-05 | /staging | a completed seed run | 1) Open `/staging`. 2) A query is executed for SELECT event_id FROM core_events WHERE event_code = 'BASEBA18'. 3) Observe the resulting UI/system response. | the result is exactly one row with event_id = 'd2df5d75-cf06-4856-a9cf-c3e8fba7f6b1' | Pass/Fail | - |
| S-06 / AC-06 | /staging | a completed seed run | 1) Open `/staging`. 2) Base_registration_type is queried for event_id = 'd2df5d75-cf06-4856-a9cf-c3e8fba7f6b1'. 3) Observe the resulting UI/system response. | exactly two active rows are returned: "BA18 Seed Standard" and "BA18 Seed Guardian Review", both with cost = 0 and capacity = null | Pass/Fail | - |
| S-07 / AC-07 | /staging | a completed seed run | 1) Open `/staging`. 2) Core_forms is queried for the BASEBA18 event_id. 3) Observe the resulting UI/system response. | one row is returned with workflow_type = 'base_registration', access_mode = 'authenticated_member', and is_primary_entrypoint = true. When base_form_registration_type is queried for that form_id, two binding rows are returned | Pass/Fail | - |
| S-08 / AC-08 | /staging | a completed seed run | 1) Open `/staging`. 2) Base_application is queried for the BASEBA18 event_id grouped by status. 3) Observe the resulting UI/system response. | exactly four groups are returned: one submitted, one under_review, one approved, one rejected | Pass/Fail | - |
| S-09 / AC-09 | /staging | a completed seed run | 1) Open `/staging`. 2) Base_application_check is joined to base_application and filtered to the BASEBA18 event_id. 3) Observe the resulting UI/system response. | one pending check row is returned, anchored to the under_review application | Pass/Fail | - |
| S-10 / AC-10 | /applications | a completed seed run and a test user with appropriate BASE organiser scope selecting the BASEBA18 event in the BASE shell | 1) Open `/applications`. 2) The user navigates to /applications. 3) Observe the resulting UI/system response. | the applications list renders with at least one non-empty row (backed by the seeded applications, not by hardcoded fixture records in the route) | Pass/Fail | - |
| S-11 / AC-11 | /staging | a completed seed run | 1) Open `/staging`. 2) Base_registration_type_requirement is queried joined to base_registration_type and filtered to the BASEBA18 event_id and the "BA18 Seed Guardian Review" type. 3) Observe the resulting UI/system response. | exactly one row is returned with check_type = 'guardian_approval' and id = 'f80cf10b-8ad6-4935-b319-e412f4d96757' | Pass/Fail | - |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: -
- defect links: N/A
- retest needed: [Yes/No]
