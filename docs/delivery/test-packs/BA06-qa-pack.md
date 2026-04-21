# Manual QA Pack: BA06 Applications Admin And Review

## Slice metadata

- Slice ID: BA06
- Requirement source: `docs/requirements/BA06-applications-admin-and-review_requirements.md`
- Depends on: BA04, BA05a

## Preconditions/environment

- Applications seeded across review states.
- Reviewer and event-admin accounts.
- At least one application with outstanding checks.

## Scenario list

- Verify `/applications` list and detail load with event scope filters.
- Verify reviewer actions for approve/reject/under-review transitions.
- Verify admin override flow and unresolved check visibility after override.
- Verify review notes/audit data visibility and persistence.
- Verify denied-state behavior for users without review authority.

## Expected outcomes

- Review transitions follow backend-owned rules and permissions.
- Override behavior is explicit and auditable.
- Unresolved checks remain visible when required by contract.

## Edge cases

- Invalid transition request from current status.
- Concurrent reviewer actions on same application.
- Reviewer role can view but not override.

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
