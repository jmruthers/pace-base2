# BA03 QA Pack

## Slice metadata

- slice_id: BA03
- app: pace-base2
- requirement_path: docs/requirements/BA03-forms-authoring-and-base-integration-requirements.md

## Manual frontend scenarios

| scenario_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 / AC-01 | /forms | a user with read:page.forms and an event selected | 1) Open `/forms`. 2) navigate to /forms. 3) Observe the resulting UI/system response. | the page renders the "Forms" h1, the "Create Form" button (if they also have create permission), and a card grid of all forms for the event in descending creation order. (FL-PE-01, FL-PE-02, FL-PA-01) | Pass | - |
| S-02 / AC-02 | /forms | the forms list renders | 1) Open `/forms`. 2) Data loads. 3) Observe the resulting UI/system response. | each form card shows: form name, field count ("N fields"), status badge with correct colour, workflow type label, schedule line when dates are set, and portal URL link when `VITE_PORTAL_BASE_URL` is set. (FL-PC-01–06, BR-01, BR-02, BR-03) | Pass | - |
| S-03 / AC-03 | /forms | a form card with opens_at = null and closes_at = null | 1) Open `/forms`. 2) The card renders. 3) Observe the resulting UI/system response. | neither "Opens:" nor "Closes:" lines appear. (BR-02) | Pass | - |
| S-04 / AC-04 | /forms | a user with update:page.forms | 1) Open `/forms`. 2) click the Preview button on a form card. 3) Observe the resulting UI/system response. | the portal URL opens in a new browser tab. (FL-PC-08, BR-03) | Pass | - |
| S-05 / AC-05 | /forms | VITE_PORTAL_BASE_URL is configured | 1) Open `/forms`. 2) A form card renders. 3) Click the portal URL link in the card body. | the full portal URL is visible as a hyperlink; following it opens the portal in a new tab. (FL-PC-09, BR-03) | Pass | - |
| S-06 / AC-06 | /forms | VITE_PORTAL_BASE_URL is not set | 1) Open `/forms`. 2) The user clicks Preview on a form card. 3) Observe the resulting UI/system response. | no portal URL link on cards; Preview shows a destructive toast: "Portal URL is not configured. Set VITE_PORTAL_BASE_URL." (FL-EC-01) | Pass | - |
| S-07 / AC-07 | /forms | a user with update:page.forms | 1) Open `/forms`. 2) click Delete on a form card and confirm, and the RPC returns deleted=true. 3) Observe the resulting UI/system response. | the form card disappears from the list and a success toast "Form deleted successfully." appears. (FL-PA-03–05, BR-08) | Pass | - |
| S-08 / AC-08 | /forms | a form has submissions | 1) Open `/forms`. 2) The user confirms deletion and the RPC returns deleted=false with response_count=3. 3) Observe the resulting UI/system response. | the confirmation dialog closes and a blocking dialog opens describing the 3 submissions. (FL-PA-04, BR-08, BR-09) | Pass | - |
| S-09 / AC-09 | /forms | a user without update:page.forms | 1) Open `/forms`. 2) The form list renders. 3) Observe the resulting UI/system response. | no Delete buttons appear on any form card. (FL-PR-03) | Pass | - |
| S-10 / AC-10 | /forms | no event is selected | 1) Open `/forms`. 2) The user navigates to /forms. 3) Observe the resulting UI/system response. | no card grid renders and the message "Select an event from the header to manage forms." appears. (FL-ES-01) | Pass | - |
| S-11 / AC-11 | /forms | an event is selected and there are no forms | 1) Open `/forms`. 2) The page loads. 3) Observe the resulting UI/system response. | the "No forms yet." empty state card renders. (FL-ES-02) | Pass | - |
| S-12 / AC-12 | /forms | the forms list query fails | 1) Open `/forms`. 2) The page renders. 3) Observe the resulting UI/system response. | a destructive Alert with the error message appears in place of the card grid. (FL-ER-01) | Pass | - |
| S-13 / AC-13 | /forms | a user without read:page.forms | 1) Open `/forms`. 2) navigate to /forms. 3) Observe the resulting UI/system response. | <AccessDenied /> renders. (FL-PR-01) | Pass | - |
| S-14 / AC-14 | /form-builder | a user with read:page.form-builder | 1) Open `/form-builder`. 2) navigate to /form-builder (no formId). 3) Observe the resulting UI/system response. | the shell renders immediately with "Create Form" as the heading and all fields empty; Save is enabled until Save is attempted, then authoring validation surfaces inline per FB-PA-01 / FB-PC-04 / BR-11. | Pass | - |
| S-15 / AC-15 | /forms | a user types a form name in create mode | 1) Open `/forms`. 2) The name changes. 3) Observe the resulting UI/system response. | the slug field auto-populates with a derived value matching the slug derivation algorithm. (BR-05, BR-13) | Pass | - |
| S-16 / AC-16 | /forms | a user fills in valid form metadata and at least one field | 1) Open `/forms`. 2) click "Save Form". 3) Observe the resulting UI/system response. | app_base_form_upsert is called, then app_base_form_fields_replace is called with the form's ID, a success toast fires, and the page navigates to /forms. (FB-PA-01–02, BR-14) | Pass | - |
| S-17 / AC-17 | /form-builder | workflowType = 'base_registration' and the event has active registration types | 1) Open `/form-builder` with base_registration selected. 2) Wait for types to load. 3) Observe the binding panel. | Active types appear as checkbox rows with **Set as default** radios. (FB-PC-08) | Pass | - |
| S-17b / FB-ES-01 | /form-builder | workflowType = 'base_registration' and the event has no active registration types | 1) Open `/form-builder` with base_registration selected. 2) Wait for types fetch to complete. 3) Observe the binding panel. | Explanatory empty copy appears; **Create registration type** links to `/registration-type-builder` when create is permitted. (FB-ES-01) | Pass/Fail | - |
| S-18 / AC-18 | /form-builder | a user navigates to /form-builder?formId={id} | 1) Open `/form-builder`. 2) The page loads. 3) Observe the resulting UI/system response. | a loading spinner appears, then the shell renders with the saved form data pre-populated. (FB-PE-02, FB-LS-01, BR-12) | Pass | - |
| S-19 / AC-19 | /forms | a published form is loaded in edit mode | 1) Open `/forms`. 2) The builder renders. 3) Observe the resulting UI/system response. | the Slug field is read-only and cannot be changed. (BR-06, FB-PC-02) | Pass | - |
| S-20 / AC-20 | /forms | a user edits opensAt in the schedule panel | 1) Open `/forms`. 2) save. 3) Observe the resulting UI/system response. | app_base_form_upsert is called with opens_at set to an ISO midnight-UTC string. (FB-PC-06, BR-18) | Pass | - |
| S-21 / AC-21 | /forms | a user edits max_submissions to 50 | 1) Open `/forms`. 2) save. 3) Observe the resulting UI/system response. | app_base_form_upsert's p_definition contains max_submissions: 50. (FB-PC-07, BR-15) | Pass | - |
| S-22 / AC-22 | /form-builder | no event is selected | 1) Open `/form-builder`. 2) The user navigates to /form-builder. 3) Observe the resulting UI/system response. | the shell does not render and the message "Select an event from the header before creating or editing a form." appears. (FB-NV-01) | Pass | - |
| S-23 / AC-23 | /form-builder | a user without read:page.form-builder | 1) Open `/form-builder`. 2) navigate to /form-builder. 3) Observe the resulting UI/system response. | <AccessDenied /> renders. (FB-PR-01) | Pass | - |
| S-24 / AC-24 | /forms | a user with read but not update:page.form-builder | 1) Open `/forms`. 2) The builder renders. 3) Observe the resulting UI/system response. | the Save button is hidden and the shell fields render disabled. (FB-PR-02) | Pass | - |

## Test run summary

- overall result: Pass
- scenarios executed: 24 (S-01–S-24)
- failed scenarios: none
- defect links: N/A
- retest needed: No
