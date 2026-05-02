# BA15 QA Pack

## Slice metadata

- slice_id: BA15
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA15-reporting-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | FI-02 | `/reports` | Open `/reports` without `reports.read` permission. | Access-denied fallback renders and reporting surface is not shown. |  |  |
| S-02 | FI-08 | `/reports` | Open `/reports` with permission but no selected event. | No-event state "Select an event to run reports" is shown and builder is hidden. |  |  |
| S-03 | FI-18, FI-19 | `/reports` | Open reports with selected event and inspect initial builder state. | Explore selector shows Participants/Units/Activities/Scans and field catalog loads for active explore. |  |  |
| S-04 | FI-27, FI-23, FI-24 | `/reports` | Select one or more fields and run report. | Execution succeeds and results table renders with selected columns plus standard table tools. |  |  |
| S-05 | FI-09, FI-27 | `/reports` | Attempt to run report with no selected fields. | Run action is blocked and validation state is shown. |  |  |
| S-06 | FI-32, FI-33, FI-35 | `/reports` template panel | Save a template, load it, then delete it from confirmation dialog. | Template lifecycle actions persist and restore configuration per contract, including delete confirmation behavior. |  |  |
| S-07 | FI-36, BR-10 | `/reports` explore selector | Configure selection in one explore, then switch to another explore. | Selected fields, filters, sorts, and results are cleared on explore switch. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
