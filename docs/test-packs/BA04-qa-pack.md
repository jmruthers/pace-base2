# BA04 QA Pack

## Slice metadata

- slice_id: BA04
- app: pace-base2
- requirement_path: docs/requirements/BA04-registration-setup-and-policy-requirements.md

## Manual frontend scenarios

| scenario_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|
| S-01 / AC-01 | /registration-types | 1) Sign in with read on registration types; clear event selection in the shell header. 2) Open `/registration-types`. 3) Read the main content and toolbar. | Card copy **Select an event from the header to manage registration types.** appears; registration type grid and **Create registration type** are not shown. | Pass | - |
| S-02 / AC-02 | /registration-types | 1) Select an event that has registration types (e.g. BASE BA18 Seed Event after dev seed). 2) Open `/registration-types`. 3) On each type card, note **N eligibility rules**. 4) Optionally compare **N** to eligibility rows for that type in the database. | Each card’s **N eligibility rules** matches the persisted eligibility row count for that registration type (zero types show **0 eligibility rules**). | Pass | - |
| S-03 / AC-03 | /registration-type-builder | 1) With an event selected and create permission, open `/registration-types` and click **Create registration type**. 2) Enter **Name** and valid **Cost**; fill other fields as desired. 3) Click **Save**. | URL gains **registrationTypeId**; success toast **Saved registration type settings.**; **Approval workflow** section becomes active. | Pass | - |
| S-04 / AC-04 | /registration-type-builder | 1) With an event selected, open create or **Edit** on a registration type. 2) Click **Add eligibility rule**. 3) Choose **DOB before** or **DOB after**. 4) Leave the date empty (or enter invalid text if the control allows). 5) Click **Save**. | Inline validation (**Value is required.** or **Date must be in YYYY-MM-DD format.**); upsert does not run until the rule is valid. | Pass | - |
| S-05 / AC-05 | /registration-types | 1) Sign in as a user **without** read access to registration types. 2) Open `/registration-types`. | **AccessDenied** (or equivalent); no registration types list or authoring controls beneath the guard. | Pass | Use dev-db RBAC test account without read. |
| S-06 / AC-06 | /registration-types | 1) Sign in with read **without** update on registration types. 2) Open `/registration-types` with types visible. 3) Inspect each card’s actions and status chrome. | **Edit** and **Delete** are absent; **Enabled** / **Disabled** badges still show on cards. | Pass | Use dev-db RBAC test account with read-only. |
| S-07 / AC-07 | /registration-type-builder | 1) With update permission, open **Edit** on a type. 2) Toggle **Registration type active**. 3) Click **Save**. 4) Return to the list. | Success toast; on the list, that card’s **Enabled** / **Disabled** badge matches the saved state. | Pass | - |
| S-08 / AC-08 | /registration-type-builder | 1) Open builder for an event type with multiple requirements (e.g. **BA18 Seed Guardian Review**). 2) In **Approval workflow**, reorder rows. 3) Click **Save**. 4) Reopen the same type in the builder. | Success toast **Saved approval workflow.**; requirement order matches the order saved (list numbering reflects new sequence). | Pass | - |
| S-09 / AC-09 | /registration-type-builder | 1) Open builder for a registration type. 2) In **Approval workflow**, add **Designated organisation review** if needed. 3) Leave the reviewing organisation unselected. 4) Click **Save**. | Inline **Select a reviewing organisation** under that row; upsert does not run. | Pass - |
| S-10 / AC-10 | /registration-types | 1) With update permission, open `/registration-types` for an event with a type that has **no** applications and **no** form bindings to that type. 2) Click **Delete** on the card; confirm **Delete registration type**. | Confirmation closes; type disappears after refetch; toast **Registration type deleted successfully.** | Pass | - |
| S-11 / AC-11 | /registration-types | 1) With update permission, open `/registration-types` for a type that has at least one **application** or **form binding**. 2) Click **Delete** on the card. | **Cannot delete registration type** dialog explains applications and/or form bindings **without** a prior destructive confirmation; type remains in the list. | Pass | - |

## Test run summary

- overall result: Pass
- failed scenarios: -
- defect links: N/A
- retest needed: No
