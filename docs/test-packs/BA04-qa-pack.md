# BA04 QA Pack

## Slice metadata

- slice_id: BA04
- app: pace-base2
- requirement_path: docs/requirements/BA04-registration-setup-and-policy-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|---|
| S-01 | AC-01 | /configuration | no event selection, permission passes, navigating page shows select-event Card and hides create control | 1) Open `/configuration`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given no event selection, permission passes, navigating page shows select-event Card and hides create control. | Pass/Fail | - |
| S-02 | AC-02 | /configuration | event selection with types, authorised user sees N eligibility rules summary matching database counts | 1) Open `/configuration`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given event selection with types, authorised user sees N eligibility rules summary matching database counts. | Pass/Fail | - |
| S-03 | AC-03 | /configuration | valid create inputs, confirming save executes upsert returning id, refreshes grid, toast success | 1) Open `/configuration`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given valid create inputs, confirming save executes upsert returning id, refreshes grid, toast success. | Pass/Fail | - |
| S-04 | AC-04 | /configuration | invalid dob format, validation blocks save confirmation | 1) Open `/configuration`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given invalid dob format, validation blocks save confirmation. | Pass/Fail | - |
| S-05 | AC-05 | /configuration | user lacks read, AccessDenied renders | 1) Open `/configuration`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given user lacks read, AccessDenied renders. | Pass/Fail | - |
| S-06 | AC-06 | /manage | user lacks update, edit/manage controls and Switch are absent (fallback={null} guards) while read-only badges still render | 1) Open `/manage`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given user lacks update, edit/manage controls and Switch are absent (fallback={null} guards) while read-only badges still render. | Pass/Fail | - |
| S-07 | AC-07 | /configuration | toggling Switch success updates badge without page reload failures | 1) Open `/configuration`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given toggling Switch success updates badge without page reload failures. | Pass/Fail | - |
| S-08 | AC-08 | /configuration | drag reorder + save requirements, reorder reflected by ascending sort_order after server refetch confirms the new ordering | 1) Open `/configuration`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given drag reorder + save requirements, reorder reflected by ascending sort_order after server refetch confirms the new ordering. | Pass/Fail | - |
| S-09 | AC-09 | /configuration | designated org requirement save without organisation selected, destructive inline validation prevents confirm | 1) Open `/configuration`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given designated org requirement save without organisation selected, destructive inline validation prevents confirm. | Pass/Fail | - |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: -
- defect links: N/A
- retest needed: [Yes/No]
