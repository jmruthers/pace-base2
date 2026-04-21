# Manual QA Pack: BA09 Activity Offering And Session Setup

## Slice metadata

- Slice ID: BA09
- Requirement source: `docs/requirements/BA09-activity-offering-and-session-setup_requirements.md`
- Depends on: BA01

## Preconditions/environment

- Event with activity setup permissions.
- Existing offerings/sessions for edit coverage.
- User without organiser permission for denied-state checks.

## Scenario list

- Verify `/activities` supports offering create/edit and listing.
- Verify `/activities/:offeringId` supports session create/edit with capacity and timing fields.
- Verify booking window and session validation rules are enforced.
- Verify inactive/invalid offerings are handled predictably in setup UI.
- Verify denied-state behavior for non-authorized users.

## Expected outcomes

- Offering and session models are clearly separated.
- Capacity/window/time constraints are validated via contract.
- Setup ownership remains organiser/admin only.

## Edge cases

- Session end time earlier than start time.
- Capacity zero/negative or invalid value.
- Offering update attempted outside permissible event scope.

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
