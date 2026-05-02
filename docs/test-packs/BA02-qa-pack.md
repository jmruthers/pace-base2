# BA02 QA Pack

## Slice metadata

- slice_id: BA02
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA02-shared-forms-platform-contracts-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | C-19 | Host surface mounting `WorkflowFormAuthoringShell` | Open authoring shell with validation errors present. | Validation summary shows destructive error state and save row is disabled when `validation.isValid` is false. |  |  |
| S-02 | C-19 | Host surface mounting `WorkflowFormAuthoringShell` | Correct authoring state until validation becomes valid. | Validation summary shows ready state and save row is no longer blocked by validation. |  |  |
| S-03 | C-19, C-23 | Authoring shell preview target card | Toggle workflow type/primary entrypoint/event slug combinations. | Preview path/reason matches `buildWorkflowPreviewTarget` rule outcomes. |  |  |
| S-04 | C-20 | Host surface mounting `WorkflowFormMetadataEditor` | Open metadata editor and inspect controls. | Metadata section includes Name, Slug, Description, Workflow type options, Access mode, Status, Primary entrypoint, and Active controls. |  |  |
| S-05 | C-21 | Host surface mounting `WorkflowFormFieldEditor` | Add a field, inspect ordering and edit display options with invalid JSON. | Fields are sorted by `sortOrder`; add creates default field key/type; invalid JSON is ignored and previous valid parsed value remains. |  |  |
| S-06 | C-19, C-23 | Host surface wiring `onPreviewTarget` | Change inputs that alter computed preview target. | `onPreviewTarget` fires when preview target changes and stays aligned with preview card output. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
