# BA06 QA Pack

## Slice metadata

- slice_id: BA06
- app: pace-base2
- requirement_path: docs/requirements/BA06-applications-admin-and-review-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | §11-01 | /applications | 1) Sign in with `read:page.applications`. 2) Clear event selection in the shell header. 3) Open `/applications`. | Select-event **Card** shows copy **Select an event from the header to view its applications**; applications queue table does not render. | Pass/Fail | - |
| S-02 | §11-02 | /applications | 1) Sign in with read permission. 2) Select an event with applications (e.g. BA18 seed). 3) Open `/applications`. 4) Inspect queue columns and row cells. | Queue shows applicant **name**, **email**, **registration type**, badged application **status**, **submitted** column, and **checks** priority badge per BR-CHECK-SUMMARY. | Pass/Fail | - |
| S-03 | §11-03 | /applications | 1) With an event that has multiple applications at different submit times, open `/applications`. 2) Compare row order to known oldest-first submit order. | Oldest submitted application appears at the top of the queue (FIFO). | Pass/Fail | - |
| S-04 | §11-04 | /applications | 1) Sign in as a user without `read:page.applications`. 2) Open `/applications`. | **AccessDenied** renders; queue and detail affordances do not appear. | Pass/Fail | Use dev-db RBAC account without read. |
| S-05 | §11-05 | /applications | 1) With read permission and an event selected, open `/applications`. 2) Open **View** (detail) on an application that has linked form evidence. 3) Read the evidence section entries. | Evidence lists only form responses scoped to that application (no unrelated subjects visible in the list). | Pass/Fail | - |
| S-06 | §11-06 | /applications | 1) Open application detail while evidence is still loading (throttle network if needed). 2) Observe the evidence section before data arrives. | Evidence section shows **LoadingSpinner** until the query resolves. | Pass/Fail | - |
| S-07 | §11-07 | /applications | 1) Open application detail with evidence fetch failing (simulate offline or blocked request). 2) Read the evidence section. | Compact destructive alert with **Retry** appears inside the evidence section; remainder of the detail dialog stays visible. | Pass/Fail | - |
| S-08 | §11-08 | /applications | 1) Sign in with update permission and RPC available. 2) Open detail for an application with pending **event_approval** check. 3) Use **Satisfy** or **Reject check** and confirm. 4) Refresh or reopen detail. | Action succeeds; check status in UI updates after refresh. | Pass/Fail | - |
| S-09 | §11-09 | /applications | 1) Open detail for an application with pending **guardian_approval** check. 2) Click **Reissue** and complete the flow. | Reissue succeeds and a success toast appears. | Pass/Fail | - |
| S-10 | §11-10 | /applications | 1) Open detail for an application with status **under review**. 2) Click **Approve** and confirm. 3) Close dialog and inspect the queue row. | Application status badge shows **approved** after success. | Pass/Fail | - |
| S-11 | §11-11 | /applications | 1) Open detail for an **under review** application. 2) Start **Reject** and confirm without entering notes. | Client validation blocks submit; rejection-notes-required feedback shows; dialog stays open. | Pass/Fail | - |
| S-12 | §11-12 | /applications | 1) Open detail for an application already **approved** in another session (or pre-approve via second browser). 2) Attempt **Approve** or **Reject** from the stale dialog. | Message appears: **This application's status has already been updated — close this dialog and refresh the queue to see the current state.** | Pass/Fail | - |
| S-13 | §11-13 | /applications | 1) Open `/applications` with list fetch failing. 2) Use **Retry** on the destructive alert. | List refetches and renders successfully after retry. | Pass/Fail | - |
| S-14 | §11-14 | /applications | 1) Open `/applications` for an event that includes an application with zero checks. 2) Inspect that row’s actions menu. | **View review steps** does not appear in row actions. | Pass/Fail | - |
| S-15 | §11-15 | /applications | 1) Open `/applications` in an environment where `app_base_application_check_set_status` is unavailable per §14. 2) Open detail for an application with pending **event_approval**. | **Satisfy** / **Reject check** actions for event_approval are not rendered; backend blocker alert is shown per §14. | Pass/Fail | Only runnable when target env lacks the RPC. |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: -
- defect links: N/A
- retest needed: [Yes/No]
