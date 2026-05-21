# BA16 QA Pack

## Slice metadata

- slice_id: BA16
- app: pace-base2
- requirement_path: docs/requirements/BA16-scanning-tracking-dashboard-requirements.md

## Manual frontend scenarios

| scenario_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 / AC-01 | /scanning/tracking | an approved participant with an accepted site-in scan (validation_result = 'accepted' at a context_type = 'site' scan point with direction = 'in') | 1) Open `/scanning/tracking`. 2) The Site Presence tab loads. 3) Observe the resulting UI/system response. | that participant is counted in the On-site tile | Pass/Fail | - |
| S-02 / AC-02 | /scanning/tracking | an approved participant with zero base_scan_event rows for any scan point in the event | 1) Open `/scanning/tracking`. 2) The Site Presence tab loads. 3) Observe the resulting UI/system response. | that participant is counted in the Never Scanned tile | Pass/Fail | - |
| S-03 / AC-03 | /scanning/tracking | an approved participant whose only base_scan_event rows have validation_result = 'rejected' | 1) Open `/scanning/tracking`. 2) The Site Presence tab loads. 3) Observe the resulting UI/system response. | that participant does not appear in any headline tile count | Pass/Fail | - |
| S-04 / AC-04 | /scanning/tracking | an off-site participant whose last accepted scan at a non-site scan point is at "Archery Range (context_type = 'activity')" | 1) Open `/scanning/tracking`. 2) The off-site drill-down is viewed. 3) Observe the resulting UI/system response. | that participant appears in the "Archery Range (Activity)" location group | Pass/Fail | - |
| S-05 / AC-05 | /scanning/tracking | the event has activity scan points with accepted scans | 1) Open `/scanning/tracking`. 2) The Activity tab loads. 3) Observe the resulting UI/system response. | each activity scan point appears with a count of accepted scans and a direction badge | Pass/Fail | - |
| S-06 / AC-06 | /scanning/tracking | the event has transport scan points with accepted scans | 1) Open `/scanning/tracking`. 2) The Transport tab loads. 3) Observe the resulting UI/system response. | each transport scan point appears with a count of accepted scans and a direction badge | Pass/Fail | - |
| S-07 / AC-07 | /scanning/tracking | a participant has base_scan_event rows including upload_conflict rows | 1) Open `/scanning/tracking`. 2) Their history is viewed in the Participant History tab. 3) Observe the resulting UI/system response. | all rows including upload_conflict rows are shown in the history DataTable | Pass/Fail | - |
| S-08 / AC-08 | /scanning/tracking | a base_scan_event row with validation_result = 'upload_conflict' | 1) Open `/scanning/tracking`. 2) It appears in the Participant History DataTable. 3) Observe the resulting UI/system response. | the Result cell shows a warning Badge labelled "Upload conflict" | Pass/Fail | - |
| S-09 / AC-09 | /scanning/tracking | the operator presses "Refresh", then all tracking data sections re-fetch from Supabase, the last-updated timestamp updates on success, and a destructive toast appears if the re-fetch fails | 1) Open `/scanning/tracking`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | all tracking data sections re-fetch from Supabase, the last-updated timestamp updates on success, and a destructive toast appears if the re-fetch fails | Pass/Fail | - |
| S-10 / AC-10 | /scanning/tracking | an unauthenticated user or a user without read:page.scanning navigates to /scanning/tracking, then AccessDenied is rendered and no tracking data or participant information is exposed | 1) Open `/scanning/tracking`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | AccessDenied is rendered and no tracking data or participant information is exposed | Pass/Fail | - |
| S-11 / AC-11 | /scanning/tracking | no event is selected | 1) Open `/scanning/tracking`. 2) /scanning/tracking is accessed. 3) Observe the resulting UI/system response. | the blocking "No event selected" Card is shown and no data fetches run | Pass/Fail | - |
| S-12 / AC-12 | /scanning/tracking | a base_scan_event result set for a section reaches the 500-row limit, then an informational Alert is shown in that section notifying the operator that the result set has been capped | 1) Open `/scanning/tracking`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | an informational Alert is shown in that section notifying the operator that the result set has been capped | Pass/Fail | - |
| S-13 / AC-13 | /scanning/tracking | the operator clicks a location group in the Site Presence off-site breakdown, then the group expands to reveal individual participant rows with names and last-scan timestamps | 1) Open `/scanning/tracking`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | the group expands to reveal individual participant rows with names and last-scan timestamps | Pass/Fail | - |
| S-14 / AC-14 | /scanning/tracking | the operator types at least 2 characters in the Participant History search field, then a dropdown of matching participants appears. Selecting a participant loads their chronological scan history | 1) Open `/scanning/tracking`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | a dropdown of matching participants appears. Selecting a participant loads their chronological scan history | Pass/Fail | - |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: -
- defect links: N/A
- retest needed: [Yes/No]
