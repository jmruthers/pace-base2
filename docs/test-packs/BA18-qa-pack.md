# BA18 QA Pack

## Slice metadata

- slice_id: BA18
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA18-base-dev-seed-data-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | AC-01, F-05, F-15 | Shell event selector + `/applications` | Execute BA18 seed reset, select event code `BASEBA18`, then open `/applications`. | Event is available and applications list is non-empty from seeded database rows. |  |  |
| S-02 | AC-02, F-02 | Shell event selector + `/applications` | Execute BA18 seed reset a second time, then revisit `BASEBA18` applications list. | Re-run remains stable and list state stays valid without duplicate-data regressions. |  |  |
| S-03 | AC-06, AC-07 | `/forms` and registration type context screens | With `BASEBA18` selected, inspect form and registration type surfaces tied to seed records. | Seed registration types and seed registration form/bindings are available for manual verification flows. |  |  |
| S-04 | AC-09 | `/applications` detail/check context | Open the `under_review` seeded application and inspect check status in admin detail surface. | Pending seeded application check is present and tied to the seeded under-review application. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
