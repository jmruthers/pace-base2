# BA06 QA Pack

## Slice metadata

- slice_id: BA06
- app: pace-base2
- requirement_path: docs/requirements/BA06-applications-admin-and-review-requirements.md

## Manual frontend scenarios

| scenario_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 / AC-01 | /applications | no event selected and read permitted, the user sees the select-event Card with copy "Select an event from the header to view its applications", not an empty table | 1) Open `/applications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given no event selected and read permitted, the user sees the select-event Card with copy "Select an event from the header to view its applications", not an empty table. | Pass/Fail | - |
| S-02 / AC-02 | /applications | event with applications, the queue shows name, email, registration type, badged status, submitted column, and checks priority badge (BR-CHECK-SUMMARY) | 1) Open `/applications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given event with applications, the queue shows name, email, registration type, badged status, submitted column, and checks priority badge (BR-CHECK-SUMMARY). | Pass/Fail | - |
| S-03 / AC-03 | /applications | queue ordering, oldest submitted application appears first (FIFO) | 1) Open `/applications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given queue ordering, oldest submitted application appears first (FIFO). | Pass/Fail | - |
| S-04 / AC-04 | /applications | a denied read permission, AccessDenied renders | 1) Open `/applications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given a denied read permission, AccessDenied renders. | Pass/Fail | - |
| S-05 / AC-05 | /applications | view detail, evidence lists only responses with workflow_subject_id matching the application id and type base_application | 1) Open `/applications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given view detail, evidence lists only responses with workflow_subject_id matching the application id and type base_application. | Pass/Fail | - |
| S-06 / AC-06 | /applications | detail open with evidence loading, evidence section shows LoadingSpinner until query resolves | 1) Open `/applications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given detail open with evidence loading, evidence section shows LoadingSpinner until query resolves. | Pass/Fail | - |
| S-07 / AC-07 | /applications | evidence fetch failure, compact destructive alert with Retry appears inside evidence section; rest of dialog remains visible | 1) Open `/applications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given evidence fetch failure, compact destructive alert with Retry appears inside evidence section; rest of dialog remains visible. | Pass/Fail | - |
| S-08 / AC-08 | /applications | event_approval pending, permitted user, and RPC present: Satisfy / Reject check succeed and refresh shows updated check status | 1) Open `/applications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given event_approval pending, permitted user, and RPC present: Satisfy / Reject check succeed and refresh shows updated check status. | Pass/Fail | - |
| S-09 / AC-09 | /applications | guardian_approval pending, Reissue succeeds and shows success toast | 1) Open `/applications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given guardian_approval pending, Reissue succeeds and shows success toast. | Pass/Fail | - |
| S-10 / AC-10 | /applications | application under review, Approve transitions status to approved (RPC success, list badge updates) | 1) Open `/applications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given application under review, Approve transitions status to approved (RPC success, list badge updates). | Pass/Fail | - |
| S-11 / AC-11 | /applications | application reject confirm without notes, client validation blocks mutation, shows the rejection-notes-required feedback, and keeps the dialog open | 1) Open `/applications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given application reject confirm without notes, client validation blocks mutation, shows the rejection-notes-required feedback, and keeps the dialog open. | Pass/Fail | - |
| S-12 / AC-12 | /applications | an application already approved by another session, calling Approve/Reject shows the concurrency message "This application's status has already been updated — close this dialog and refresh the queue to see the current state." | 1) Open `/applications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given an application already approved by another session, calling Approve/Reject shows the concurrency message "This application's status has already been updated — close this dialog and refresh the queue to see the current state." | Pass/Fail | - |
| S-13 / AC-13 | /applications | list fetch error, destructive alert with Retry refetches successfully | 1) Open `/applications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given list fetch error, destructive alert with Retry refetches successfully. | Pass/Fail | - |
| S-14 / AC-14 | /applications | an application with zero checks, View review steps does not appear in the row actions | 1) Open `/applications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given an application with zero checks, View review steps does not appear in the row actions. | Pass/Fail | - |
| S-15 / AC-15 | /applications | backend environment missing app_base_application_check_set_status, event_approval actions are not rendered and a backend blocker is raised per §14 | 1) Open `/applications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | Given backend environment missing app_base_application_check_set_status, event_approval actions are not rendered and a backend blocker is raised per §14. | Pass/Fail | - |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: -
- defect links: N/A
- retest needed: [Yes/No]
