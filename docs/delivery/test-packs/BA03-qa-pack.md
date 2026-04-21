# Manual QA Pack: BA03 Forms Authoring And BASE Integration

## Slice metadata

- Slice ID: BA03
- Requirement source: `docs/requirements/BA03-forms-authoring-and-base-integration_requirements.md`
- Depends on: BA00, BA01, BA02

## Preconditions/environment

- Author role with form management permission.
- Existing event context selected.
- Typed forms contracts from BA02 available.

## Scenario list

- Verify `/forms` loads list and supports create/edit/publish transitions.
- Verify `/form-builder` creates and updates form definitions using typed field model.
- Verify preview/share behavior respects access mode and workflow constraints.
- Verify permission denied behavior for non-author roles.
- Verify registration-entrypoint binding data is surfaced as contract-driven metadata.

## Expected outcomes

- Authoring remains bounded to BASE admin capabilities.
- Builder no longer depends on legacy table/column field targeting.
- Publish/edit operations are backend-owned and permission-checked.

## Edge cases

- Attempt to publish incomplete/invalid definition.
- Concurrent edit collision for same form.
- Author has event access but lacks authoring permission.

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
