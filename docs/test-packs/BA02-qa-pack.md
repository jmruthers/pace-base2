# BA02 QA Pack

## Slice metadata

- slice_id: BA02
- app: pace-base2
- requirement_path: docs/requirements/BA02-shared-forms-platform-contracts-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|---|
| S-01 | AC-01 | /pace-core/forms | a WorkflowAuthoringState with workflowType set to a value not in the approved taxonomy | 1) Open `/pace-core/forms`. 2) ValidateWorkflowAuthoringState is called. 3) Observe the resulting UI/system response. | result.isValid is false and result.errors contains an invalid_workflow_type issue | Pass/Fail | - |
| S-02 | AC-02 | /pace-core/forms | a WorkflowAuthoringState where two active fields share the same fieldKey | 1) Open `/pace-core/forms`. 2) ValidateWorkflowAuthoringState is called. 3) Observe the resulting UI/system response. | result.isValid is false and result.errors contains a duplicate_field_key issue for the second occurrence | Pass/Fail | - |
| S-03 | AC-03 | /pace-core/forms | a WorkflowAuthoringState with isActive = true and at least one validation error | 1) Open `/pace-core/forms`. 2) ValidateWorkflowAuthoringState is called. 3) Observe the resulting UI/system response. | result.errors includes an activation_blocked issue and result.isValid is false | Pass/Fail | - |
| S-04 | AC-04 | /pace-core/forms | a form where opens_at is a future UTC timestamp and is_active = true | 1) Open `/pace-core/forms`. 2) The time-window decision table in §6.8 is applied. 3) Observe the resulting UI/system response. | the resolved WorkflowEntrypointState is not_yet_open. Full rendering enforcement is verified in BA05a §11 and BA10 §11 | Pass/Fail | - |
| S-05 | AC-05 | /pace-core/forms | a form where closes_at is a past UTC timestamp and is_active = true | 1) Open `/pace-core/forms`. 2) The time-window decision table in §6.8 is applied. 3) Observe the resulting UI/system response. | the resolved WorkflowEntrypointState is closed. Full rendering enforcement is verified in BA05a §11 and BA10 §11 | Pass/Fail | - |
| S-06 | AC-06 | /pace-core/forms | the dev-db at rkytnffgmwnnmewevqgp | 1) Open `/pace-core/forms`. 2) The MCP verification SQL in §8 is run. 3) Observe the resulting UI/system response. | workflow_type, owner_app_id, access_mode, workflow_config, is_primary_entrypoint, and title are all present in core_forms | Pass/Fail | - |
| S-07 | AC-07 | /column | the dev-db at rkytnffgmwnnmewevqgp | 1) Open `/column`. 2) The MCP verification SQL in §8 is run. 3) Observe the resulting UI/system response. | context_id and all three require_*_confirmation columns are absent from core_forms, table_name/column_name are absent from core_form_fields and core_form_response_values, and target_table/target_record_id are absent from core_form_responses | Pass/Fail | - |
| S-08 | AC-08 | /pace-core/forms | the dev-db at rkytnffgmwnnmewevqgp | 1) Open `/pace-core/forms`. 2) The MCP verification SQL in §8 is run. 3) Observe the resulting UI/system response. | core_form_context_types and core_form_field_config are absent from the public schema | Pass/Fail | - |
| S-09 | AC-09 | /pace-core/forms | a TypeScript file that imports WorkflowFormAuthoringShell, WorkflowFormMetadataEditor, WorkflowFormFieldEditor, validateWorkflowAuthoringState, and buildWorkflowPreviewTarget from @solvera/pace-core/forms | 1) Open `/pace-core/forms`. 2) The consuming app's type-checker runs. 3) Observe the resulting UI/system response. | all five imports resolve without error | Pass/Fail | - |
| S-10 | AC-10 | /pace-core/forms | a WorkflowSubmissionPayload built from a submitted form, then payload.values is an array of { fieldKey: string; value: unknown } objects — no table_name or column_name keys are present anywhere in the payload | 1) Open `/pace-core/forms`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | payload.values is an array of { fieldKey: string; value: unknown } objects — no table_name or column_name keys are present anywhere in the payload | Pass/Fail | - |
| S-11 | AC-11 | /pace-core/forms | a base_registration form with exactly one base_form_registration_type row in dev-db | 1) Open `/pace-core/forms`. 2) Base_form_registration_type is queried and mapped. 3) Observe the resulting UI/system response. | the resulting registrationBindings array has exactly one entry. Given a form with two rows, the array has two entries. (The rendering consequence — whether a type selector is shown — is verified in BA05a §11.) | Pass/Fail | - |
| S-12 | AC-12 | /pace-core/forms | a WorkflowAuthoringState with workflowType = 'org_signup' and accessMode = 'public' | 1) Open `/pace-core/forms`. 2) ValidateWorkflowAuthoringState is called. 3) Observe the resulting UI/system response. | result.isValid is false and result.errors includes invalid_workflow_access_combination | Pass/Fail | - |
| S-13 | AC-13 | /pace-core/forms | a WorkflowAuthoringState with isPrimaryEntrypoint = true and workflowType = 'information_collection' | 1) Open `/pace-core/forms`. 2) ValidateWorkflowAuthoringState is called. 3) Observe the resulting UI/system response. | result.errors includes invalid_entrypoint | Pass/Fail | - |
| S-14 | AC-14 | /camp-alpha/application | a state with workflowType = 'base_registration', isPrimaryEntrypoint = true, and options.eventSlug = 'camp-alpha' | 1) Open `/camp-alpha/application`. 2) BuildWorkflowPreviewTarget is called. 3) Observe the resulting UI/system response. | result.path is '/camp-alpha/application' and result.reason is 'base_primary_entrypoint' | Pass/Fail | - |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: -
- defect links: N/A
- retest needed: [Yes/No]
