# Manual QA Pack: BA11 Activity Booking Operations And Oversight

## Slice metadata

- Slice ID: BA11
- Requirement source: `docs/requirements/BA11-activity-booking-operations-and-oversight_requirements.md`
- Depends on: BA09, BA10

## Preconditions/environment

- Activity bookings across multiple statuses.
- Organiser/operator accounts with oversight permissions.
- At least one capacity and conflict edge condition present.

## Scenario list

- Verify `/activities/bookings` loads operational booking overview.
- Verify booking oversight filters and detail views are accurate.
- Verify permitted operational actions execute and update status correctly.
- Verify denied operational actions are blocked for insufficient roles.
- Verify oversight reflects participant booking rules defined in BA10.

## Expected outcomes

- Oversight surface consumes setup + booking contracts consistently.
- Actions are auditable and permission-scoped.
- Operational views reflect latest booking state transitions.

## Edge cases

- Two operators attempt conflicting actions on same booking.
- Oversight view stale after upstream session capacity change.
- Attempt to mutate booking in terminal status.

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
