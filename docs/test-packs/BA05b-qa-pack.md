# BA05b QA Pack

## Slice metadata

- slice_id: BA05b
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA05b-participant-application-progress-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | §3.4, PP-01 | Participant progress route | Open progress route without an authenticated participant session. | Sign-in gating appears and progress RPC is not called before authentication. |  |  |
| S-02 | §3.4 | Participant progress route (invalid id) | Open route using a non-UUID `applicationId`. | Invalid identifier state is shown and progress RPC is not called. |  |  |
| S-03 | PP-04, PP-08, PP-09, PP-10 | Participant progress route (owned application) | Open progress for an owned application with checks. | Payload-backed view renders application + registration type + ordered checks with raw status values. |  |  |
| S-04 | PP-08, AC-05 | Participant progress route | Open progress for an owned application with zero check rows. | Progress view loads successfully with `checks` as an empty list. |  |  |
| S-05 | PP-13, PP-14, AC-03 | Participant progress route payload inspection | Inspect returned progress payload for sensitive field exposure. | Sensitive keys (token fields, staff audit fields, carer/referee ids) are absent from response surface. |  |  |
| S-06 | PP-02, PP-03, AC-04 | Participant progress route (unauthorized application) | Attempt to open progress for an application not owned by the signed-in user. | Access-denied outcome is shown without exposing whether the target id exists. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
