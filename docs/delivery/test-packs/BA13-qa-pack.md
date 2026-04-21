# Manual QA Pack: BA13 Scanning Runtime And Validation

## Slice metadata

- Slice ID: BA13
- Requirement source: `docs/requirements/BA13-scanning-runtime-and-validation_requirements.md`
- Depends on: BA06, BA11, BA12
- Scanning ownership note: BA13 covers runtime scan flow and validation mapping.

## Preconditions/environment

- Active scan point with runtime route `/scanning/:scanPointId`.
- Valid/invalid card scenarios prepared.
- Operator account with runtime permissions.

## Scenario list

- Verify valid card scan produces accepted runtime result and persisted mapping.
- Verify each rejected class maps to correct `validation_result` / `validation_reason`.
- Verify manual scan flow works when card read is unavailable.
- Verify allowed override path for overridable invalid scans.
- Verify denied behavior for unauthorized runtime access/actions.

## Expected outcomes

- Runtime outcomes are deterministic and persisted with canonical mapping.
- Manual and override flows are explicit, auditable, and role-scoped.
- Runtime route remains separate from admin shell workflows.

## Edge cases

- Duplicate scan attempt within rejection/duplicate window.
- Offline runtime capture with delayed persistence handoff.
- Override attempted for non-overridable rejection class.

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
