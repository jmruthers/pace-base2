# BA01 QA Pack

## Slice metadata

- slice_id: BA01
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA01-event-workspace-and-configuration-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | D-ES-01 | `/event-dashboard` | Open `/event-dashboard` with no selected event. | Event identity and nav cards are hidden; message reads "Select an event from the header to begin." |  |  |
| S-02 | D-PC-07, D-PC-08 | `/event-dashboard` | Select an event and load dashboard. | Exactly five nav cards render with expected titles and card content. |  |  |
| S-03 | D-PA-01, D-NV-01 | `/event-dashboard` | Click each nav card from the dashboard. | Full card click navigates to the correct destination route while event context is preserved. |  |  |
| S-04 | C-NC-01 | `/configuration` | Open `/configuration` with no selected event. | Form is replaced by no-event message "No event selected. Choose an event from the header to begin." |  |  |
| S-05 | C-LS-01, C-PC-01 | `/configuration` | Open `/configuration` with a selected event during initial load. | Centered spinner with "Loading event data..." appears, then header card "Event Configuration" renders once loaded. |  |  |
| S-06 | C-PA-02, C-PA-03, C-PA-04 | `/configuration` | Edit valid fields and save, then trigger a save error path. | Valid save shows success toast and keeps form populated; failed save shows mutation error feedback and keeps form editable for retry. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
