# BA17 QA Pack

## Slice metadata

- slice_id: BA17
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA17-communications-and-system-notifications-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | PP-01, PE-01 | `/communications` | Open `/communications` without `read:page.communications`. | AccessDenied renders and compose surface is not shown. |  |  |
| S-02 | ES-01, PE-01 | `/communications` | Open `/communications` with read permission but no selected event. | No-event message is shown and compose/filter UI is hidden. |  |  |
| S-03 | PP-03, BR-14 | `/communications` | Open page with read+create but without update permission. | Draft editing is available, while Send now / Schedule / Send test actions are hidden. |  |  |
| S-04 | SA-01, BR-13 | `/communications` filter bar | Apply registration type, status, and unit filters; then clear filters. | Recipient pool preview updates with AND-across-dimensions semantics and clear-filters resets all controls. |  |  |
| S-05 | PA-02, BR-01 | `CommComposer` | Enter unresolved merge token content with send blocking enabled. | Send now is disabled and unresolved-token alert is shown until tokens resolve. |  |  |
| S-06 | PA-01, PA-03, PA-04 | `CommComposer` actions | Execute Send now, Schedule, and Send test with valid drafts. | Each action shows expected success/failure feedback and reset behavior per contract. |  |  |
| S-07 | SN-01, SN-05, BR-05 | BA05a/BA06 system-notification call sites | Trigger workflows that issue guardian request and application-approved notifications. | Notifications use BA17 keys/recipient contracts, and notification send failure does not roll back primary workflow action. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
