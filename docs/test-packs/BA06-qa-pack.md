# BA06 QA Pack

## Slice metadata

- slice_id: BA06
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA06-applications-admin-and-review-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | PQ-ES-02 | `/applications` | Open `/applications` with no selected event. | Select-event card is shown and queue content/actions are hidden. |  |  |
| S-02 | PM-PR-01 | `/applications` | Open `/applications` without `read:page.applications`. | AccessDenied renders and no queue content is shown. |  |  |
| S-03 | PQ-PC-01, PQ-PC-02, BR-CHECK-SUMMARY | `/applications` queue | Load queue for selected event with application data. | Queue card and table render required columns and check-summary badge behavior. |  |  |
| S-04 | PD-PC-04, BR-EVIDENCE-FILTER | Application detail dialog | Open application detail and evaluate evidence loading, success, empty, and error/retry states. | Evidence section stays scoped to workflow-subject application responses and handles states without closing dialog. |  |  |
| S-05 | PD-PA-01, PD-PA-02, PD-PA-03 | Application detail approve/reject | Trigger application approve and reject confirmation flows on eligible rows. | Status mutation flows follow confirmation, success, and concurrency/error handling requirements. |  |  |
| S-06 | PQ-PC-03, PR-SE-01, PR-SE-02 | Queue row actions and review steps dialog | Open row with checks and open View review steps; compare with row that has zero checks. | Review steps action appears only when checks exist; dialog shows ordered read-only steps and closes without mutation. |  |  |
| S-07 | PM-EC-01 | Application detail `event_approval` check actions | Validate behavior for environments where `app_base_application_check_set_status` is missing. | `event_approval` satisfy/reject actions are not rendered and blocker behavior is preserved. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
