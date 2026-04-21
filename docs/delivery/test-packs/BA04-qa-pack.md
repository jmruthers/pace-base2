# Manual QA Pack: BA04 Registration Setup And Policy

## Slice metadata

- Slice ID: BA04
- Requirement source: `docs/requirements/BA04-registration-setup-and-policy_requirements.md`
- Depends on: BA01, BA02, BA03

## Preconditions/environment

- Event with registration configuration enabled.
- Admin user with registration policy write permission.
- Secondary user with read-only access.

## Scenario list

- Verify `/registration-types` lists and creates registration types.
- Verify eligibility and requirement ordering can be configured and saved.
- Verify activation/deactivation or policy toggle behavior follows contract.
- Verify policy read/write permission separation.
- Verify required-policy outputs are visible to downstream application flow assumptions.

## Expected outcomes

- Registration setup is explicit, event-scoped, and contract-driven.
- Requirement order and eligibility rules persist consistently.
- Unauthorized policy mutations are denied with clear feedback.

## Edge cases

- Invalid requirement order or duplicate sequence values.
- Registration type created without required policy fields.
- Toggle action attempted by unauthorized user.

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
