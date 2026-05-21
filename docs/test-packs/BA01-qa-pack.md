# BA01 QA Pack

## Slice metadata

- slice_id: BA01
- app: pace-base2
- requirement_path: docs/requirements/BA01-event-workspace-and-configuration-requirements.md

## Manual frontend scenarios

| scenario_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 / AC-01 | /event-dashboard | a permitted user with an event selected | 1) Open `/event-dashboard`. 2) navigate to /event-dashboard. 3) Observe the resulting UI/system response. | the event identity card renders with name, formatted start date, end date (if computed), venue, and logo. (D-PE-01, D-PC-01–D-PC-06, §6.1, §6.5) | Pass | - |
| S-02 / AC-02 | /event-dashboard | a permitted user with no event selected | 1) Open `/event-dashboard`. 2) navigate to /event-dashboard. 3) Observe the resulting UI/system response. | the event identity card and nav grid do not render and a single message reads "Select an event from the header to begin." (D-ES-01) | Pass | - |
| S-03 / AC-03 | /event-dashboard | a permitted user with an event selected | 1) Open `/event-dashboard`. 2) The dashboard renders. 3) Observe the resulting UI/system response. | exactly five nav cards appear: Forms, Applications, Registration Types, Reports, Communications. (D-PC-07) | Pass | - |
| S-04 / AC-04 | /event-dashboard | a permitted user with an event selected | 1) Open `/event-dashboard`. 2) The dashboard's count fetches succeed. 3) Observe the resulting UI/system response. | each of Forms / Applications / Registration Types shows a numeric count; Reports and Communications show no count. (D-PC-07, D-PC-08) | Pass | - |
| S-05 / AC-05 | /event-dashboard | a permitted user | 1) Open `/event-dashboard`. 2) A count fetch fails for any nav card. 3) Observe the resulting UI/system response. | that card's count slot shows — and the rest of the dashboard remains usable. (D-ER-01) | Pass | - |
| S-06 / AC-06 | /event-dashboard | a non-permitted user (read:page.event-dashboard denied) | 1) Open `/event-dashboard`. 2) navigate to /event-dashboard. 3) Observe the resulting UI/system response. | <AccessDenied /> replaces the page content. (D-PR-01) | Pass | - |
| S-07 / AC-07 | /configuration | a permitted user with read:page.configuration | 1) Open `/configuration`. 2) navigate to /configuration. 3) Observe the resulting UI/system response. | the form loads showing the event's current values. (C-PE-01, C-PC-02–C-PC-12) | Pass | - |
| S-08 / AC-08 | /event-dashboard | a user with read:page.configuration but not update:page.configuration | 1) Open `/event-dashboard`. 2) The form renders. 3) Observe the resulting UI/system response. | all fields are disabled, the "Save" button is hidden, and the logo upload control is hidden; the logo display remains visible. (C-PR-02, C-PR-03, §10) | Pass | - |
| S-09 / AC-09 | /event-dashboard | a user with read and update permissions | 1) Open `/event-dashboard`. 2) edit fields and click "Save" with valid input. 3) Observe the resulting UI/system response. | a success toast "Event saved successfully!" appears and the database row is updated with the submitted values; the form does not reload from the database. (C-PA-02, C-PA-03, §6.9) | Pass | - |
| S-10 / AC-10 | /event-dashboard | a user with both permissions | 1) Open `/event-dashboard`. 2) click "Save" with event_name empty. 3) Observe the resulting UI/system response. | a "Validation Error" toast appears, an inline error appears beneath the Event Name field, and no database write occurs. (C-PA-02, §6.6) | Pass | - |
| S-11 / AC-11 | /event-dashboard | a user with both permissions | 1) Open `/event-dashboard`. 2) click "Save" without selecting a Registration Scope. 3) Observe the resulting UI/system response. | a validation error appears beneath the Select and submission aborts. (§6.6, §6.7) | Pass | - |
| S-12 / AC-12 | /event-dashboard | a user with both permissions | 1) Open `/event-dashboard`. 2) enter invalid JSON in the Event Colours field and save. 3) Observe the resulting UI/system response. | a destructive toast "Invalid JSON in Event Colours field: …" appears and submission aborts. (§6.8) | Pass | - |
| S-13 / AC-13 | /event-dashboard | a user with both permissions | 1) Open `/event-dashboard`. 2) upload a valid image under 5MB via the logo control. 3) Observe the resulting UI/system response. | a success toast appears and the displayed logo updates to the new image. (C-PA-05, §6.4) | Pass | - |
| S-14 / AC-14 | /event-dashboard | a user with both permissions | 1) Open `/event-dashboard`. 2) attempt to upload a file over 5MB or a non-image MIME type. 3) Observe the resulting UI/system response. | the upload is rejected before any mutation and a destructive toast "Failed to upload logo: …" appears; the previously-displayed logo is unchanged. (§6.4) | Pass | - |
| S-15 / AC-15 | /configuration | a user without read:page.configuration | 1) Open `/configuration`. 2) navigate to /configuration. 3) Observe the resulting UI/system response. | <AccessDenied /> replaces the page content. (C-PR-01) | Pass | - |
| S-16 / AC-16 | /configuration | a permitted user with no event selected | 1) Open `/configuration`. 2) navigate to /configuration. 3) Observe the resulting UI/system response. | the form does not render and a single message reads "No event selected. Choose an event from the header to begin." (C-NC-01) | Pass | - |
| S-17 / AC-17 | /configuration | the configuration page is loading | 1) Open `/configuration`. 2) The user lands on /configuration with an event selected. 3) Observe the resulting UI/system response. | a centred LoadingSpinner and the caption "Loading event data…" render until the event row arrives. (C-LS-01) | Pass | - |

## Test run summary

- overall result: Pass
- pass count: 17
- fail count: 0
- untested count (still marked Pass/Fail): 0
- failed scenarios: -
- defect links: -
- retest needed: No
