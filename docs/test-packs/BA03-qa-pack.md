# BA03 QA Pack

## Slice metadata

- slice_id: BA03
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA03-forms-authoring-and-base-integration-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | FL-ES-01, FL-PE-02 | `/forms` | Clear selected event and open `/forms`. | Select-event message card renders; grid and Create Form button are hidden. |  |  |
| S-02 | FL-PE-01, FL-PC-01, FL-PC-02, FL-PC-03, FL-PC-04, FL-PC-05, FL-PC-06, BR-01, BR-02 | `/forms` | Select event and load forms list. | Cards render in descending created order with required metadata and status badge mapping; open/close lines render only when values are present. |  |  |
| S-03 | FL-PC-10 | `/forms` card action row | Click Copy URL when clipboard API succeeds. | URL is copied and icon switches to checkmark briefly, then resets. |  |  |
| S-04 | FL-EC-01 | `/forms` Preview / Copy URL actions | With `VITE_PORTAL_BASE_URL` missing, click Preview or Copy URL. | Destructive toast indicates portal URL is not configured; no preview navigation and no clipboard write. |  |  |
| S-05 | FL-PA-03, FL-PA-05, BR-08 | `/forms` delete flow | Delete a form where RPC returns `deleted=true`. | Pending state appears, dialog closes, form is removed/refreshed, and success toast is shown. |  |  |
| S-06 | FL-PA-04, BR-08, BR-09 | `/forms` delete blocked flow | Delete a form where RPC returns `deleted=false` with response/binding counts. | Cannot delete dialog opens with count-based blocking message and form remains in list. |  |  |
| S-07 | FB-PE-01, FB-PA-01, FB-PA-02, BR-11, BR-14 | `/form-builder` create flow | From `/forms`, create a form with valid metadata and at least one field, then save. | Save sequence succeeds, success toast appears, and navigation returns to `/forms`. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
