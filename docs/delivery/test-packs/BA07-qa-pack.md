# Manual QA Pack: BA07 Token Approval Actions

## Slice metadata

- Slice ID: BA07
- Requirement source: `docs/requirements/BA07-token-approval-actions_requirements.md`
- Depends on: BA04, BA05a
- Boundary note: BASE owns token contracts; token approval UI route is pace-portal owned (`/approvals/:token`).

## Preconditions/environment

- Application checks requiring token-based actions.
- Valid token, expired token, and reissued token test data.
- Admin/reviewer account for resend/reissue operations.

## Scenario list

- Verify valid token submit flow updates check state correctly.
- Verify reject outcome requires required note payload (if mandated by contract).
- Verify expired token is denied with deterministic response.
- Verify token reissue invalidates previous token immediately.
- Verify no BASE-origin participant approval route is used.

## Expected outcomes

- Token actions are secure, single-use, and backend-owned.
- Replay/expired token attempts fail safely.
- Route ownership remains pace-portal for participant-facing approval action.

## Edge cases

- Multiple rapid submits for same token.
- Token resolution after check already resolved via admin override.
- Reissue performed while prior token link is actively open.

## Pass/fail evidence fields

| Field | Evidence |
| --- | --- |
| Tester |  |
| Date |  |
| Environment |  |
| Scenario IDs passed |  |
| Scenario IDs failed |  |
| Evidence links (screenshots/video/logs) |  |
| Defects filed |  |
| Retest result |  |

## Reviewer notes

- Notes:
- Follow-ups:

## Sign-off summary

- Final result: [Pass/Fail/Blocked]
- Reviewer:
