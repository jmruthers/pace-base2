# BA18 QA Pack

## Slice metadata

- slice_id: BA18
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA18-base-dev-seed-data-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | AC-10, F-15, §12 Scenario 4 | `/applications` | After executing BA18 seed/reset contract, sign in with scoped organiser permissions, select event `BASEBA18`, and open `/applications`. | Applications list shows seeded rows for the selected event (non-empty, data-backed). |  |  |
| S-02 | AC-01, AC-02, §12 Scenario 1, §12 Scenario 2 | shell event selector and `/applications` | After first seed run and after idempotent rerun, select `BASE BA18 Seed Event` and open `/applications`. | UI remains loadable and continues to show seeded applications after rerun. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
