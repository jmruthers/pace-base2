# BA07 QA Pack

## Slice metadata

- slice_id: BA07
- app: pace-base2
- requirement_path: docs/requirements/BA07-token-approval-actions-requirements.md

## Manual frontend scenarios

| scenario_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 / AC-01 | /approvals | a pending non-expired check with a known raw token | 1) Open `/approvals`. 2) App_base_application_check_resolve_token is called. 3) Observe the resulting UI/system response. | the JSON contains only keys in §7.2 with non-null event_title, registration_type_name, applicant_display_name, and check_type matching joined rows | Pass/Fail | - |
| S-02 / AC-02 | /approvals | the same token after a successful submit | 1) Open `/approvals`. 2) Resolve is called again. 3) Observe the resulting UI/system response. | the call fails with message Invalid or expired token | Pass/Fail | - |
| S-03 / AC-03 | /approvals | p_outcome = 'reject' and p_notes null or whitespace-only | 1) Open `/approvals`. 2) Submit is called. 3) Observe the resulting UI/system response. | the call fails with Comments are required for reject | Pass/Fail | - |
| S-04 / AC-04 | /approvals | p_outcome = 'approve' and p_notes null | 1) Open `/approvals`. 2) Submit succeeds. 3) Observe the resulting UI/system response. | base_application_check.notes is null and status is satisfied | Pass/Fail | - |
| S-05 / AC-05 | /approvals | p_outcome = 'reject' with non-empty trimmed notes | 1) Open `/approvals`. 2) Submit succeeds. 3) Observe the resulting UI/system response. | status is failed and returned new_status is failed | Pass/Fail | - |
| S-06 / AC-06 | /approvals | a migrated backend where app_base_advance_application_checks exists | 1) Open `/approvals`. 2) Submit succeeds. 3) Observe the resulting UI/system response. | the helper runs in the same transaction (verified by migration review or integration test that fails the helper to roll back submit) | Pass/Fail | - |
| S-07 / AC-07 | /approvals | reissue called with p_expiry_interval omitted | 1) Open `/approvals`. 2) Defaults apply. 3) Observe the resulting UI/system response. | new expiry is approximately now + 14 days (same calendar-day policy as BA05a verification) | Pass/Fail | - |
| S-08 / AC-08 | /approvals | resolve output inspected as text | 1) Open `/approvals`. 2) A grep runs for forbidden substrings token_hash, notes (as a keyed field in resolve payload — must be absent). 3) Observe the resulting UI/system response. | no forbidden keys from §6.7 appear | Pass/Fail | - |
| S-09 / AC-09 | /approvals | app_base_application_check_reissue_token called successfully with an organiser session | 1) Open `/approvals`. 2) The return JSON is inspected. 3) Observe the resulting UI/system response. | it contains exactly the keys check_id, token, token_expires_at with no additional keys, and token_expires_at is a UTC ISO-8601 string | Pass/Fail | - |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: -
- defect links: N/A
- retest needed: [Yes/No]
