# Manual QA Pack: BA10 Participant Activity Booking Experience

## Slice metadata

- Slice ID: BA10
- Requirement source: `docs/requirements/BA10-participant-activity-booking-experience_requirements.md`
- Depends on: BA02, BA05a, BA08, BA09
- Boundary note: BASE owns booking contracts; participant booking UI is pace-portal owned.

## Preconditions/environment

- Offerings/sessions configured with booking windows and capacities.
- Eligible participant/application context available.
- Coordinator/admin accounts for cross-role checks.

## Scenario list

- Verify participant booking flow applies eligibility and scope checks.
- Verify booking create enforces capacity, window, duplicate, and conflict rules.
- Verify cancellation behavior updates booking status and timestamps correctly.
- Verify waitlist behavior remains within MVP boundary (no unapproved auto-promotion promises).
- Verify BASE contract outputs are consumable by portal route without BASE participant route ownership.

## Expected outcomes

- Booking operations are contract-driven and role-scoped.
- Conflict and capacity failures return clear rejection reasons.
- Participant-facing ownership remains in pace-portal.

## Edge cases

- Booking attempt after window close.
- Booking same participant into conflicting overlapping sessions.
- Coordinator attempts action not allowed by role/source rules.

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
