# BA12 QA Pack

## Slice metadata

- slice_id: BA12
- app: pace-base2
- requirement_path: docs/requirements/BA12-scanning-setup-requirements.md

## Manual frontend scenarios

| scenario_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 / AC-01 | /scanning | a user with read:page.scanning and an event selected | 1) Open `/scanning`. 2) /scanning loads. 3) Observe the resulting UI/system response. | the page renders with the "Scanning Setup" heading, the selected event name in the subtitle, and all four sections (scan points, manifests, conflicts, history) | Pass/Fail | - |
| S-02 / AC-02 | /scanning | a user with read:page.scanning and no event selected | 1) Open `/scanning`. 2) /scanning loads. 3) Observe the resulting UI/system response. | a blocking Card "No event selected" is shown and no data sections render | Pass/Fail | - |
| S-03 / AC-03 | /scanning | a user without read:page.scanning | 1) Open `/scanning`. 2) Navigating to /scanning. 3) Observe the resulting UI/system response. | AccessDenied is rendered and no scanning content is shown | Pass/Fail | - |
| S-04 / AC-04 | /scanning | a Supabase client null state | 1) Open `/scanning`. 2) /scanning loads. 3) Observe the resulting UI/system response. | a centred LoadingSpinner is shown in the main content region with no error state | Pass/Fail | - |
| S-05 / AC-05 | /scanning | an event with no scan points | 1) Open `/scanning`. 2) The scan-point DataTable loads. 3) Observe the resulting UI/system response. | the empty state "No scan points have been configured for this event." is shown with a "Create scan point" CTA (when user has create:page.scanning) | Pass/Fail | - |
| S-06 / AC-06 | /scanning | a user without create:page.scanning | 1) Open `/scanning`. 2) The scan-point DataTable loads in the empty state. 3) Observe the resulting UI/system response. | the "Create scan point" CTA is absent | Pass/Fail | - |
| S-07 / AC-07 | /scanning | a user with create:page.scanning presses "Create scan point" | 1) Open `/scanning`. 2) The dialog opens. 3) Observe the resulting UI/system response. | name, context type, direction, and conditionally resource fields are shown with no pre-populated values | Pass/Fail | - |
| S-08 / AC-08 | /scanning | the create form is submitted with context_type = 'activity' and no resource selected | 1) Open `/scanning`. 2) The form is validated. 3) Observe the resulting UI/system response. | an inline error "A resource is required for this context type." appears on the Resource field and no insert is attempted | Pass/Fail | - |
| S-09 / AC-09 | /scanning | a valid create form is submitted | 1) Open `/scanning`. 2) The insert succeeds. 3) Observe the resulting UI/system response. | the dialog closes, a success toast "Scan point created" appears, and the scan-point list refreshes with the new row | Pass/Fail | - |
| S-10 / AC-10 | /scanning | an active scan-point row | 1) Open `/scanning`. 2) The user with update:page.scanning presses Edit. 3) Observe the resulting UI/system response. | the edit dialog opens pre-populated with the row's name, context type, direction, and resource binding | Pass/Fail | - |
| S-11 / AC-11 | /scanning | an inactive scan-point row, then the Edit row action is absent regardless of user permissions | 1) Open `/scanning`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | the Edit row action is absent regardless of user permissions | Pass/Fail | - |
| S-12 / AC-12 | /scanning | an active scan-point row | 1) Open `/scanning`. 2) The user presses Deactivate and confirms in the dialog. 3) Observe the resulting UI/system response. | the row's is_active becomes false, the list refreshes, and the Activate row action appears in its place | Pass/Fail | - |
| S-13 / AC-13 | /scanning | an inactive scan-point row | 1) Open `/scanning`. 2) The user with update:page.scanning presses Activate. 3) Observe the resulting UI/system response. | no dialog is shown, the row's is_active becomes true, and the Edit and Deactivate actions become available on that row | Pass/Fail | - |
| S-14 / AC-14 | /scanning | any scan-point row | 1) Open `/scanning`. 2) The user activates the Launch control (aria-label="Launch scan point"). 3) Observe the resulting UI/system response. | the browser navigates to /scanning/:scanPointId | Pass/Fail | - |
| S-15 / AC-15 | /scanning | a user with read:page.scanning presses any manifest download button (site, activity, transport, or meal) | 1) Open `/scanning`. 2) The query runs. 3) Observe the resulting UI/system response. | the button shows a spinner and is disabled during execution, and a JSON file is downloaded after success | Pass/Fail | - |
| S-16 / AC-16 | /scanning | the manifest query returns zero rows | 1) Open `/scanning`. 2) The download completes. 3) Observe the resulting UI/system response. | a JSON file containing an empty array [] is downloaded with no error toast | Pass/Fail | - |
| S-17 / AC-17 | /scanning | the manifest query fails | 1) Open `/scanning`. 2) The failure is caught. 3) Observe the resulting UI/system response. | a toast variant='destructive' is shown with the normalised error and no file is downloaded | Pass/Fail | - |
| S-18 / AC-18 | /inactive | the scan-point list has rows with context_type = 'site' and direction = 'both', then the Name cell displays scan_point.name, the Context cell shows the "Site" badge, the Direction cell shows the "Both" badge, and both the active/inactive badge and the Badge variant="solid-acc-normal" "Offline" badge appear in the Status cell | 1) Open `/inactive`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | the Name cell displays scan_point.name, the Context cell shows the "Site" badge, the Direction cell shows the "Both" badge, and both the active/inactive badge and the Badge variant="solid-acc-normal" "Offline" badge appear in the Status cell | Pass/Fail | - |
| S-19 / AC-19 | /scanning | the conflict list has no rows with validation_result = 'upload_conflict', then the conflict DataTable shows "No unresolved sync conflicts." with no CTA | 1) Open `/scanning`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | the conflict DataTable shows "No unresolved sync conflicts." with no CTA | Pass/Fail | - |
| S-20 / AC-20 | /scanning | the conflict list has upload-conflict rows | 1) Open `/scanning`. 2) The user presses "View detail" on a row. 3) Observe the resulting UI/system response. | the conflict detail dialog opens showing scan point label, card identifier, result, original reason, scanned at, synced at, notes, and override by — all read-only with no edit affordance | Pass/Fail | - |
| S-21 / AC-21 | /scanning | the scan history DataTable | 1) Open `/scanning`. 2) A row has validation_result = 'accepted'. 3) Observe the resulting UI/system response. | the Result cell shows Badge variant="solid-main-normal" "Accepted" | Pass/Fail | - |
| S-22 / AC-22 | /scanning | a scan-point list fetch failure, then an Alert variant="destructive" with a Retry control appears in place of the scan-point DataTable | 1) Open `/scanning`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | an Alert variant="destructive" with a Retry control appears in place of the scan-point DataTable | Pass/Fail | - |
| S-23 / AC-23 | /scanning | a user without update:page.scanning, then the Edit, Deactivate, and Activate row actions are absent from all scan-point rows | 1) Open `/scanning`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | the Edit, Deactivate, and Activate row actions are absent from all scan-point rows | Pass/Fail | - |
| S-24 / AC-24 | /scanning | a scan point with context_type = 'activity', a resolved resource name 'Rock Climbing', and direction = 'in' | 1) Open `/scanning`. 2) The scan-point list loads. 3) Observe the resulting UI/system response. | the Name cell displays scan_point.name, the Context badge shows "Activity", the Direction badge shows "In", and the Resource cell shows "Rock Climbing" | Pass/Fail | - |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: -
- defect links: N/A
- retest needed: [Yes/No]
