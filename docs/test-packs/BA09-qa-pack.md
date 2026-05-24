# BA09 QA Pack

## Slice metadata

- slice_id: BA09
- app: pace-base2
- requirement_path: docs/requirements/BA09-activity-offering-setup-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | §11-list-01 | /activities | 1) Sign in with `read:page.activities`. 2) Select an event with no offerings. 3) Open `/activities`. | Offerings **DataTable** shows **No activity offerings have been created for this event.** | Pass/Fail | - |
| S-02 | §11-list-02 | /activities | 1) Select an event with offerings. 2) Open `/activities`. 3) Inspect columns and row order. | Rows ordered by name ascending; columns **Name**, **Sessions**, **Booking Opens**, **Booking Closes**, **Cost**, **TRAC Activity** are present. | Pass/Fail | - |
| S-03 | §11-list-03 | /activities | 1) Clear event selection. 2) Open `/activities`. | **No event selected** **Card** appears; offerings **DataTable** does not render. | Pass/Fail | - |
| S-04 | §11-list-04 | /activities | 1) Sign in without `read:page.activities`. 2) Open `/activities`. | **AccessDenied** renders; offerings list does not appear. | Pass/Fail | Use dev-db RBAC account without read. |
| S-05 | §11-list-05 | /activities | 1) Click **Create offering**. 2) Leave **Name** blank. 3) Submit. | Form shows **Offering name is required.** | Pass/Fail | - |
| S-06 | §11-list-06 | /activities | 1) **Create offering** with **Booking close** earlier than **Booking open**. 2) Submit. | Form shows **Booking close time must be on or after booking open time.** | Pass/Fail | - |
| S-07 | §11-list-07 | /activities | 1) **Create offering** with valid fields. 2) Save. | Offering appears in the list; toast **Offering created** appears. | Pass/Fail | - |
| S-08 | §11-list-08 | /activities | 1) **Delete** an offering that still has sessions. 2) Open delete confirmation. | **Delete** in the dialog is disabled; **All sessions must be removed** message is shown. | Pass/Fail | - |
| S-09 | §11-list-09 | /activities | 1) **Delete** an offering with no sessions. 2) Confirm delete. | Offering is removed; toast **Offering deleted** appears. | Pass/Fail | - |
| S-10 | §11-list-10 | /activities | 1) Sign in without `create:page.activities`. 2) Open `/activities` with read permission. | **Create offering** button is not visible. | Pass/Fail | - |
| S-11 | §11-detail-01 | /activities/:offeringId | 1) From `/activities`, open a valid offering. | Page shows offering name as **h1**, offering summary **Card**, and sessions **DataTable**. | Pass/Fail | - |
| S-12 | §11-detail-02 | /activities/:offeringId | 1) Navigate to `/activities/{invalid-uuid}` (or unknown id). | Destructive **Alert** with **Back to offerings** link is shown. | Pass/Fail | - |
| S-13 | §11-detail-03 | /activities/:offeringId | 1) Open an offering with zero sessions. | Sessions **DataTable** shows **No sessions have been added to this offering yet.** | Pass/Fail | - |
| S-14 | §11-detail-04 | /activities/:offeringId | 1) **Add session** with **End time** equal to or before **Start time**. 2) Submit. | Form shows **End time must be after start time.** | Pass/Fail | - |
| S-15 | §11-detail-05 | /activities/:offeringId | 1) **Add session** with **Capacity** **0**. 2) Submit. | Form shows **Capacity must be a positive whole number.** | Pass/Fail | - |
| S-16 | §11-detail-06 | /activities/:offeringId | 1) **Add session** with valid fields. 2) Save. | Session appears in the sessions list; toast **Session added** appears. | Pass/Fail | - |
| S-17 | §11-detail-07 | /activities/:offeringId | 1) **Edit offering**, change fields, and **Save**. | Summary **Card** reflects updated values; toast **Offering saved** appears. | Pass/Fail | - |
| S-18 | §11-detail-08 | /activities/:offeringId | 1) **Edit session**, change fields, and **Save**. | Sessions **DataTable** row updates; toast **Session saved** appears. | Pass/Fail | - |
| S-19 | §11-detail-09 | /activities/:offeringId | 1) **Delete** a session with no bookings. 2) Confirm. | Session is removed; toast **Session deleted** appears. | Pass/Fail | - |
| S-20 | §11-detail-10 | /activities/:offeringId | 1) **Delete** a session that has bookings. 2) Open delete confirmation. | Booking count warning is shown; **Delete** stays disabled until acknowledgement checkbox is checked. | Pass/Fail | Requires session with bookings in env. |
| S-21 | §11-detail-11 | /activities/:offeringId | 1) Sign in without `update:page.activities`. 2) Open a valid offering detail page. | **Edit offering** and **Edit** session row actions are not visible. | Pass/Fail | - |
| S-22 | §11-detail-12 | /activities/:offeringId | 1) Sign in without `create:page.activities`. 2) Open a valid offering detail page. | **Add session** button is not visible. | Pass/Fail | - |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: -
- defect links: N/A
- retest needed: [Yes/No]
