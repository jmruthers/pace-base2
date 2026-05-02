# BA07 QA Pack

## Slice metadata

- slice_id: BA07
- app: BASE
- requirement_path: /Users/jess/Documents/Solvera/pace-core2/docs/requirements/base/BA07-token-approval-actions-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 | TA-01, TA-02, TA-03 | pace-portal `/approvals/:token` | Open token route with a valid pending token. | Resolve succeeds and page renders using allow-listed resolve payload only. |  |  |
| S-02 | §7.3, TA-13 | pace-portal `/approvals/:token` | Open route with invalid, expired, or already-consumed token. | Resolve failure maps to participant-safe invalid/expired token outcome. |  |  |
| S-03 | TA-15, TA-08 | pace-portal `/approvals/:token` reject action | Resolve token, choose reject, and attempt submit with blank/whitespace comments. | Client blocks submit until trimmed reject comment is non-empty. |  |  |
| S-04 | TA-06, TA-09, TA-11 | pace-portal `/approvals/:token` approve action | Resolve token and submit outcome `approve` without notes. | Submit succeeds with `new_status='satisfied'` and token becomes unusable on replay. |  |  |
| S-05 | TA-06, TA-10, TA-11 | pace-portal `/approvals/:token` reject action | Resolve token and submit outcome `reject` with non-empty comment. | Submit succeeds with `new_status='failed'` and decision comment is persisted per contract. |  |  |
| S-06 | TA-14, §7.5 | BA06 reissue flow + portal token route | Reissue a pending guardian/referee token and attempt old/new token resolution. | Old token no longer resolves; newly issued token resolves and shows updated expiry behavior. |  |  |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: [list or -]
- defect links: [links or N/A]
- retest needed: [Yes/No]
