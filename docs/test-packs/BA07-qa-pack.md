# BA07 QA Pack

## Slice metadata

- slice_id: BA07
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA07-token-approval-actions-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | §3.5, §5.1, TA-16 | pace-portal `/approvals/:token` | Open token route with a valid pending token. | Approval page renders required event/application/check context and token-limited view behavior. |  |  |
| S-02 | §3.5 step 3, §5.2 resolve failure | pace-portal `/approvals/:token` | Open token route with invalid/expired/unusable token. | Participant-safe invalid/unusable link outcome is shown without internal state disclosure. |  |  |
| S-03 | TA-15, §3.5 step 4, §5.2 validation failure | pace-portal `/approvals/:token` reject action | Resolve token, choose reject, and attempt submit with blank/whitespace comments. | Submit is blocked until trimmed comment is non-empty and user receives visible validation feedback. |  |  |
| S-04 | §3.5 steps 5-6, §5.2 submit success, §7.4 | pace-portal `/approvals/:token` approve action | Resolve token, choose approve, and submit with no usable notes. | Submit succeeds and confirmation reflects satisfied/approved result path. |  |  |
| S-05 | §6.2, §6.4, §5.2 submit success, §7.4 | pace-portal `/approvals/:token` reject action | Resolve token, choose reject with non-empty trimmed comments, and submit. | Submit succeeds and confirmation reflects failed/rejected result path. |  |  |
| S-06 | TA-13, §5.2 submit failure, §7.3 | pace-portal `/approvals/:token` replay attempt | Attempt to resolve/submit again with already consumed or stale token. | Failure messaging matches participant-safe invalid/expired/used token handling. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
