# BA15 QA Pack

## Slice metadata

- slice_id: BA15
- app: pace-base2
- requirement_path: docs/requirements/BA15-reporting-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|---|
| S-01 | AC-01 | /reports | an authenticated user with reports.read and an event selected | 1) Open `/reports`. 2) navigate to /reports. 3) Observe the resulting UI/system response. | the page renders with ReportBuilder active on the Participants explore and the template panel visible | Pass/Fail | - |
| S-02 | AC-02 | /reports | an authenticated user without reports.read | 1) Open `/reports`. 2) navigate to /reports. 3) Observe the resulting UI/system response. | the access-denied component renders and no ReportBuilder, results table, or template panel is visible | Pass/Fail | - |
| S-03 | AC-03 | /reports | an authenticated user with reports.read and no event selected | 1) Open `/reports`. 2) navigate to /reports. 3) Observe the resulting UI/system response. | the no-event empty state ("Select an event to run reports") renders and no ReportBuilder is visible | Pass/Fail | - |
| S-04 | AC-04 | /reconciliation | a user with at least one field selected from the Participants explore | 1) Open `/reconciliation`. 2) press "Run report". 3) Observe the resulting UI/system response. | ReportResultsTable renders with one column per selected field using the field's label as the column header | Pass/Fail | - |
| S-05 | AC-05 | /reconciliation | a user with no fields selected | 1) Open `/reconciliation`. 2) view ReportBuilder. 3) Observe the resulting UI/system response. | the "Run report" button is disabled | Pass/Fail | - |
| S-06 | AC-06 | /reconciliation | a report execution that fails (adapter returns an error result) | 1) Open `/reconciliation`. 2) The user presses "Run report". 3) Observe the resulting UI/system response. | an error Alert renders in the results area with a message that does not show a partial results table; silent truncation is not acceptable | Pass/Fail | - |
| S-07 | AC-07 | /reconciliation | a user with reports.create, at least one field selected, and a template name entered | 1) Open `/reconciliation`. 2) select "Private (only me)" and press "Save". 3) Observe the resulting UI/system response. | a new row is created in core_report_template with is_private = true and created_by = user.id, and a "Template saved" toast appears | Pass/Fail | - |
| S-08 | AC-08 | /reconciliation | a user who presses "Save" with no name entered, then the save is blocked, a validation error is shown on the name field, and no row is written to core_report_template | 1) Open `/reconciliation`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | the save is blocked, a validation error is shown on the name field, and no row is written to core_report_template | Pass/Fail | - |
| S-09 | AC-09 | /reconciliation | a saved template | 1) Open `/reconciliation`. 2) A user clicks "Load". 3) Observe the resulting UI/system response. | ReportBuilder restores the explore, selected fields, filters, sorts, and column config from the template, and the report does not auto-execute | Pass/Fail | - |
| S-10 | AC-10 | /reconciliation | a template the authenticated user created | 1) Open `/reconciliation`. 2) click "Edit", update the name, and press "Update". 3) Observe the resulting UI/system response. | the template's name column is updated in core_report_template and a "Template updated" toast appears | Pass/Fail | - |
| S-11 | AC-11 | /reconciliation | a template the authenticated user created | 1) Open `/reconciliation`. 2) click "Delete" and confirm in the dialog. 3) Observe the resulting UI/system response. | the row is deleted from core_report_template, the template disappears from the list, and a "Template deleted" toast appears | Pass/Fail | - |
| S-12 | AC-12 | /reconciliation | a template created by a different user with is_private = false | 1) Open `/reconciliation`. 2) The authenticated user views the template list. 3) Observe the resulting UI/system response. | the "Edit" and "Delete" buttons are not rendered on that row; only "Load" is visible | Pass/Fail | - |
| S-13 | AC-13 | /reports | a user without reports.create | 1) Open `/reports`. 2) view /reports. 3) Observe the resulting UI/system response. | the save-template form is not rendered | Pass/Fail | - |
| S-14 | AC-14 | /reconciliation | User A saves a private template and User B shares the same event access and reports.read | 1) Open `/reconciliation`. 2) User B views the template list. 3) Observe the resulting UI/system response. | User A's private template does not appear in User B's list | Pass/Fail | - |
| S-15 | AC-15 | /reconciliation | a user who has selected three fields in the Participants explore | 1) Open `/reconciliation`. 2) switch to the Units explore. 3) Observe the resulting UI/system response. | all previously selected fields, filters, sorts, and results are cleared and the Units field catalog loads | Pass/Fail | - |
| S-16 | AC-16 | /reports | the /reports page with an event selected | 1) Open `/reports`. 2) The page loads. 3) Observe the resulting UI/system response. | the explore selector shows exactly four options: "Participants", "Units", "Activities", "Scans" | Pass/Fail | - |
| S-17 | AC-17 | /reconciliation | a user who saves a template while Event A is selected | 1) Open `/reconciliation`. 2) switch to Event B and view the template list. 3) Observe the resulting UI/system response. | the template saved under Event A is not visible in the Event B list | Pass/Fail | - |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: -
- defect links: N/A
- retest needed: [Yes/No]
