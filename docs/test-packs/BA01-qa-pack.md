# BA01 QA Pack

## Slice metadata

- slice_id: BA01
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA01-event-workspace-and-configuration-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | D-ES-01 | `/event-dashboard` | Sign in with no selected event and open `/event-dashboard`. | Event identity and nav cards are hidden; centered message reads "Select an event from the header to begin." |  |  |
| S-02 | D-PE-01, D-PE-02, D-PC-07 | `/event-dashboard` | Sign in with dashboard read permission, select an event, then open `/event-dashboard`. | Header/subtitle render and exactly five nav cards render (Forms, Applications, Registration Types, Reports, Communications). |  |  |
| S-03 | D-NV-01, D-PA-01 | `/event-dashboard` | Click a dashboard nav card when event is selected. | Card navigates to its configured route via standard link interaction. |  |  |
| S-04 | C-NC-01 | `/configuration` | Sign in with no selected event and open `/configuration`. | Configuration form is not shown and message reads "No event selected. Choose an event from the header to begin." |  |  |
| S-05 | C-LS-01 | `/configuration` | Select an event and open `/configuration` during initial data load. | Centered loading spinner appears with "Loading event data…" and form stays hidden until load completes. |  |  |
| S-06 | C-PA-02, C-PA-03 | `/configuration` | With update permission, edit valid fields and submit Save Changes. | Button shows "Saving…" and is disabled during mutation; success toast appears and form remains populated after save. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
