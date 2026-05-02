# BA04 QA Pack

## Slice metadata

- slice_id: BA04
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA04-registration-setup-and-policy-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | RL-ES-01 | `/registration-types` | Sign in with read permission, keep no event selected, and open `/registration-types`. | Blocking select-event card is shown and create/manage actions are hidden. |  |  |
| S-02 | RL-PR-01 | `/registration-types` | Sign in without read permission and navigate to `/registration-types`. | AccessDenied is shown and operational content is not rendered. |  |  |
| S-03 | RL-PR-03, RL-PA-02, RL-PA-03, RL-PA-04 | `/registration-types` list cards | Sign in with read but without update permission, select an event with existing types, and load page. | Edit/manage/switch controls are hidden while read-only content remains visible. |  |  |
| S-04 | RD-VL-01, RD-SV-01 | Registration type dialog | Open create/edit dialog, enter invalid values, and attempt Save. | Inline validation blocks save confirmation until values are valid. |  |  |
| S-05 | RD-SV-01, SV-TO-01 | `/registration-types` create flow | Create type with valid values and confirm save. | Confirmation step appears; save succeeds; list refreshes; success toast "Saved registration type settings." appears. |  |  |
| S-06 | RR-LI-03, RR-SV-01, BR-RPC, BR-SNAPSHOT | Requirements dialog | Open Manage requirements, reorder rows, save, and reopen. | Persisted order matches saved drag order after refresh/refetch. |  |  |
| S-07 | RR-CF-04 | Requirements dialog (`designated_org_review`) | Configure a designated org review requirement without selecting reviewing organisation, then attempt save. | Save is blocked; inline error "Select a reviewing organisation" appears; dialog stays open and RPC is not fired. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
