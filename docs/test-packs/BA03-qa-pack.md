# BA03 QA Pack

## Slice metadata

- slice_id: BA03
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA03-forms-authoring-and-base-integration-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | FL-ES-01 | `/forms` | Open `/forms` with no selected event. | Select-event card renders and forms grid is hidden. |  |  |
| S-02 | FL-PC-01, FL-PC-02, FL-PC-03, FL-PC-07 | `/forms` | Load `/forms` with event selected and existing forms. | Cards show name, field count, status badge, and action row (Edit, Preview, Copy URL, Delete per permission). |  |  |
| S-03 | FL-PC-09, FL-PC-10, FL-EC-01 | `/forms` card actions | Use Preview and Copy URL actions with and without `VITE_PORTAL_BASE_URL` configured. | Configured environment opens/copies URL; missing configuration shows destructive toast and no URL action executes. |  |  |
| S-04 | FL-PA-03, FL-PA-04, FL-PA-05 | `/forms` delete flow | Execute delete on both deletable and blocked forms. | Success path removes card and shows success toast; blocked path shows cannot-delete dialog and retains row. |  |  |
| S-05 | FB-PE-01, BR-11, BR-13 | `/form-builder` create mode | Open `/form-builder` without formId and type a form name, then edit slug manually. | Initial state uses create defaults, slug auto-generates from name, and manual slug edits are preserved on subsequent name changes. |  |  |
| S-06 | FB-PE-02, BR-12, BR-06 | `/form-builder?formId={id}` | Open builder in edit mode for a published form. | Saved state loads into shell and published-form slug remains locked per slice rule. |  |  |
| S-07 | FB-PA-01, FB-PA-02, BR-14 | `/form-builder` save flow | Save a valid form, including a `base_registration` form with bindings selected. | Save sequence completes in required order, success toast appears, and navigation returns to `/forms`. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
