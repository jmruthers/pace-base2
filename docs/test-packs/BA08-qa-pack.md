# BA08 QA Pack

## Slice metadata

- slice_id: BA08
- app: pace-base2
- requirement_path: docs/requirements/BA08-units-and-group-coordination-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | §11-units-01 | /units | 1) Sign in with `read:page.units`. 2) Select an event with no units. 3) Open `/units` and select the **Units** tab. | Units **DataTable** shows **No units have been created for this event.** | Pass/Fail | - |
| S-02 | §11-units-02 | /units | 1) Select an event with units. 2) Open `/units` **Units** tab. 3) Inspect columns and row order. | Rows ordered by unit number ascending; columns **Unit #**, **Unit Name**, **Subcamp**, **Contingent**, **Parent Unit** are present. | Pass/Fail | - |
| S-03 | §11-units-03 | /units | 1) On **Units** tab, start **Create unit**. 2) Leave **Unit number** blank. 3) Submit the form. | Form shows **Unit number is required.** | Pass/Fail | - |
| S-04 | §11-units-04 | /units | 1) Start **Create unit**. 2) Enter unit number **0**. 3) Submit. | Form shows **Unit number must be a positive integer.** | Pass/Fail | - |
| S-05 | §11-units-05 | /units | 1) Create a unit with valid required fields. 2) Save. | Unit appears in the list; success toast is shown. | Pass/Fail | - |
| S-06 | §11-units-06 | /units | 1) **Edit** a unit. 2) Clear **Unit name** to blank. 3) Save. | Save succeeds; list shows blank name treatment consistent with null name (not a persisted empty string in display). | Pass/Fail | - |
| S-07 | §11-units-07 | /units | 1) **Delete** a unit from the list. | **ConfirmationDialog** shows cascade warning; `window.confirm` is not used. | Pass/Fail | - |
| S-08 | §11-units-08 | /units | 1) Confirm unit delete in the dialog. | Unit is removed from the list; toast **Unit deleted** appears. | Pass/Fail | - |
| S-09 | §11-units-09 | /units | 1) **Edit** a unit that has child units. 2) Open the parent unit selector. | The edited unit and its descendants do not appear as parent options. | Pass/Fail | - |
| S-10 | §11-units-10 | /units | 1) Use **Import** on the Units **DataTable** with a CSV of valid unit numbers. 2) Complete import. | Valid rows create units; summary toast reports the import count. | Pass/Fail | - |
| S-11 | §11-units-11 | /units | 1) Sign in with read only (no create/update/delete on units). 2) Open `/units` **Units** tab. | Create, edit, and delete affordances are not visible. | Pass/Fail | Use read-only RBAC account. |
| S-12 | §11-role-types-01 | /units | 1) Open `/units` **Role Types** tab. 2) Create role type with blank **Title**. 3) Submit. | Form shows **Role title is required.** | Pass/Fail | - |
| S-13 | §11-role-types-02 | /units | 1) Create a role type with valid title. 2) Save. | Role type appears in the list; toast **Role type created** appears. | Pass/Fail | - |
| S-14 | §11-role-types-03 | /units | 1) **Delete** a role type. 2) Confirm in **ConfirmationDialog**. | Role type is removed from the list. | Pass/Fail | - |
| S-15 | §11-role-assign-01 | /units | 1) Open `/units` **Role Assignment** tab with no unit selected. | Applicant selector, role type selector, and **Assign Role** button are not visible. | Pass/Fail | - |
| S-16 | §11-role-assign-02 | /units | 1) Select a unit on **Role Assignment** tab. 2) Open the applicant selector options. | Only applications with status **approved** appear. | Pass/Fail | - |
| S-17 | §11-role-assign-03 | /units | 1) Select unit, approved applicant, and role type. 2) Click **Assign Role**. | Role is assigned; toast **Role assigned** appears. | Pass/Fail | - |
| S-18 | §11-role-assign-04 | /units | 1) Assign a role to an applicant on a unit. 2) Assign again on the same pair with a different role type. | Existing row updates role type (upsert), not a duplicate row. | Pass/Fail | - |
| S-19 | §11-role-assign-05 | /units | 1) **Remove** an assigned role. 2) Confirm in **ConfirmationDialog**. | Row shows **No role assigned**. | Pass/Fail | - |
| S-20 | §11-prefs-01 | /unit-preferences | 1) Sign in with read on unit preferences. 2) Clear event selection. 3) Open `/unit-preferences`. | Select-event **Card** appears; preference data does not load. | Pass/Fail | - |
| S-21 | §11-prefs-02 | /unit-preferences | 1) Select an event with no units. 2) Open `/unit-preferences`. | Unit selector shows the documented empty copy. | Pass/Fail | - |
| S-22 | §11-prefs-03 | /unit-preferences | 1) Select an event with units but no activity sessions. 2) Open `/unit-preferences` and pick a unit if required. | Informative **Alert** appears; preference form does not render. | Pass/Fail | - |
| S-23 | §11-prefs-04 | /unit-preferences | 1) Select a unit with draft preferences (`submitted_at` null). 2) Open `/unit-preferences`. | **Available Sessions** and **Preferences** panels render. | Pass/Fail | - |
| S-24 | §11-prefs-05 | /unit-preferences | 1) On draft preferences, add a session from **Available Sessions**. | Session moves to **Preferences** list with rank auto-assigned. | Pass/Fail | - |
| S-25 | §11-prefs-06 | /unit-preferences | 1) Remove a row from **Preferences**. | Session returns to **Available Sessions**; remaining ranks renumber contiguously. | Pass/Fail | - |
| S-26 | §11-prefs-07 | /unit-preferences | 1) Manually edit a rank to leave a gap in the sequence. | **Submit** is disabled; inline validation explains the rank issue. | Pass/Fail | - |
| S-27 | §11-prefs-08 | /unit-preferences | 1) Build a valid contiguous ranked set. 2) Click **Submit Preferences**. 3) Confirm in **ConfirmationDialog**. | Submission completes via submit flow; submitted state becomes visible. | Pass/Fail | - |
| S-28 | §11-prefs-09 | /unit-preferences | 1) Select a unit that already has submitted preferences. 2) Open `/unit-preferences`. | Read-only submitted view with submission timestamp; no add, remove, or submit controls. | Pass/Fail | - |
| S-29 | §11-prefs-10 | /unit-preferences | 1) Sign in without `read:page.unit-preferences`. 2) Open `/unit-preferences`. | **AccessDenied** renders. | Pass/Fail | Use dev-db RBAC account without read. |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: -
- defect links: N/A
- retest needed: [Yes/No]
