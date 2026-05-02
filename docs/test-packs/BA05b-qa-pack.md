# BA05b QA Pack

## Slice metadata

- slice_id: BA05b
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA05b-participant-application-progress-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | §3.4, §5.4 | Participant application progress route | Open progress route without authenticated participant session. | Standard sign-in affordance is shown and progress RPC call does not execute before authentication. |  |  |
| S-02 | §3.4, §5.2 Invalid route param | Participant application progress route (invalid `applicationId`) | Open progress route with non-UUID `applicationId`. | Participant-safe invalid identifier state is shown and RPC call is not made. |  |  |
| S-03 | §5.1, PP-15, PP-16, §5.3 | Participant application progress route (owned application) | Open progress for owned application with non-empty checks. | Sections render from payload with raw status strings and participant-safe requirements list behavior. |  |  |
| S-04 | §5.2 Success-empty-checks, §3.4 | Participant application progress route | Open progress for owned application with empty checks array. | Requirements section still renders and shows no-approval-steps helper text. |  |  |
| S-05 | §3.4, §5.2 Access denied, §6.5 | Participant application progress route (access denied case) | Open progress for unowned/denied application id while signed in. | Single participant-safe access denied message is shown without existence-oracle details. |  |  |
| S-06 | AC-07, §5.3, §6.1 | Participant application progress route | Open progress page with known fixture statuses and inspect displayed status values. | Application and check statuses display as literal raw payload values without relabeling. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
