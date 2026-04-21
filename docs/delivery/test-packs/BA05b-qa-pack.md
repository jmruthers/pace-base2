# Manual QA Pack: BA05b Participant Application Progress

## Slice metadata

- Slice ID: BA05b
- Requirement source: `docs/requirements/BA05b-participant-application-progress_requirements.md`
- Depends on: BA05a
- Boundary note: BASE owns progress contracts; participant progress UI is pace-portal owned.

## Preconditions/environment

- Existing applications in multiple statuses.
- Applicant account with portal access.
- Reviewer/admin account for cross-checking state.

## Scenario list

- Verify participant progress view reflects current application/check state model.
- Verify blocked/required-action states show check-level detail correctly.
- Verify approved/rejected/withdrawn outcomes reflect backend lifecycle.
- Verify progress read access is scoped to the correct participant/application.
- Verify BASE contract outputs consumed by portal route without BASE participant page.

## Expected outcomes

- Progress semantics come from application/check contracts, not ad hoc UI inference.
- Participant sees only authorized application data.
- Status and check details remain consistent across participant and organiser perspectives.

## Edge cases

- Application has unresolved checks but organiser override already applied.
- Participant attempts to view another participant's application.
- Stale client cache after status transition.

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
