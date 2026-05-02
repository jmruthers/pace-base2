# BA04 QA Pack

## Slice metadata

- slice_id: BA04
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA04-registration-setup-and-policy-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | RL-ES-01 | `/registration-types` | Open `/registration-types` with no selected event. | Select-event blocking card is shown and operational controls are hidden. |  |  |
| S-02 | RL-PR-01 | `/registration-types` | Open `/registration-types` without `read` permission. | AccessDenied renders and page content is not shown. |  |  |
| S-03 | RL-PC-01, RL-PC-02, RL-PC-03, RL-PC-05 | `/registration-types` card grid | Load page with selected event and existing registration types. | Cards display type name, enabled/disabled badge, eligibility rule count, and optional cost/capacity summaries. |  |  |
| S-04 | RL-PR-03, RL-PA-02, RL-PA-03, RL-PA-04 | `/registration-types` actions | View page as user with read but no update permission. | Edit, manage requirements, and active switch controls are not rendered. |  |  |
| S-05 | RD-VL-01, RD-SV-01, RD-SV-02 | Registration type dialog | Create/edit a type with invalid then valid values and proceed through confirmation step. | Validation blocks invalid input; valid save requires confirmation and persists updates successfully. |  |  |
| S-06 | RR-LI-03, RR-LI-04, RR-SV-01 | Requirements dialog | Add requirement rows, reorder via drag, and save through confirmation step. | Saved requirement order and row set match the post-save refetch. |  |  |
| S-07 | RR-CF-04 | Requirements dialog (`designated_org_review`) | Add designated org review row without selecting reviewing org and attempt save. | Save is blocked and inline error "Select a reviewing organisation" is shown for that row. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
