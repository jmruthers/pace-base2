# BA06 QA Pack

## Slice metadata

- slice_id: BA06
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA06-applications-admin-and-review-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | PQ-ES-02 | `/applications` | Sign in with read permission, keep no selected event, and open `/applications`. | Queue card shows select-event message and queue actions/data are not shown. |  |  |
| S-02 | PM-PR-01 | `/applications` | Sign in without `read:page.applications` and navigate to `/applications`. | AccessDenied is shown and queue is not rendered. |  |  |
| S-03 | PQ-PE-02, PQ-PE-03, PQ-PE-04, PQ-PC-01, PQ-PC-02 | `/applications` queue table | Select event with applications and load `/applications`. | Queue table renders required columns/order and list behavior for selected event. |  |  |
| S-04 | PD-PC-04, BR-EVIDENCE-FILTER | Application detail dialog (opened from `/applications`) | Open View on an application and inspect evidence section through loading/success/error states. | Evidence section behavior follows required loading, empty, and retry/error patterns without closing dialog. |  |  |
| S-05 | PD-PA-01, PD-PA-02 | Application detail approve flow | Open approvable application, trigger Approve application, and confirm. | Confirmation and success/concurrency handling follow required flow and messaging. |  |  |
| S-06 | PQ-PC-03 | `/applications` row actions | Open list with an application whose checks array is empty. | View review steps action is hidden for that row. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
