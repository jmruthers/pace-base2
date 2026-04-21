# Manual QA Pack: BA08 Units And Group Coordination

## Slice metadata

- Slice ID: BA08
- Requirement source: `docs/requirements/BA08-units-and-group-coordination_requirements.md`
- Depends on: BA06

## Preconditions/environment

- Event with units and role types.
- Coordinator/leader role accounts.
- Sessions available for preference ranking.

## Scenario list

- Verify `/units` create/edit/delete unit hierarchy flows.
- Verify role assignment and updates for unit members.
- Verify `/unit-preferences` rank submission and lock behavior.
- Verify preference updates do not trigger booking allocations directly.
- Verify role-based access differences between viewer and editor.

## Expected outcomes

- Unit management remains event-scoped and contract-compliant.
- Preference ranking remains distinct from booking allocation.
- Unauthorized role changes and preference mutations are denied.

## Edge cases

- Duplicate rank value within same unit/session preference set.
- Preference submit after lock/closure window.
- Attempt to assign unsupported role type.

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
