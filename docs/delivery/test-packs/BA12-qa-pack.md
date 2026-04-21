# Manual QA Pack: BA12 Scanning Setup

## Slice metadata

- Slice ID: BA12
- Requirement source: `docs/requirements/BA12-scanning-setup_requirements.md`
- Depends on: BA01, BA09
- Scanning ownership note: BA12 covers setup/manifest only.

## Preconditions/environment

- Event with scanning enabled and activity context available.
- Operator/admin account with scan setup permissions.
- Device profile(s) available for scan-point configuration tests.

## Scenario list

- Verify `/scanning` supports scan-point create/edit and context configuration.
- Verify manifest download/generation entrypoints are accessible for authorized roles.
- Verify setup metadata (context type/direction/resource link) persists correctly.
- Verify denied-state behavior for users lacking setup permissions.
- Verify BA12 does not expose queue/sync reconciliation controls (BA14 scope).

## Expected outcomes

- Setup and manifest operations are clearly defined and event-scoped.
- Only authorized roles can mutate scan-point configuration.
- Setup UI does not leak runtime/sync ownership responsibilities.

## Edge cases

- Invalid context/resource pairing for scan point.
- Duplicate scan-point identifiers for same context.
- Manifest request with missing required setup data.

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
