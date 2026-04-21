# Manual QA Pack: BA15 Reporting

## Slice metadata

- Slice ID: BA15
- Requirement source: `docs/requirements/BA15-reporting_requirements.md`
- Depends on: BA06, BA08, BA11, BA14
- Run-state note: BA15 remains deferred until CR22/shared reporting foundations are available.

## Preconditions/environment

- CR22 readiness status known for current run.
- Reporting field catalog and explores available in environment (if CR22-ready).
- Reporter and non-reporter role accounts.

## Scenario list

- Verify `/reports` loads shared reporting engine entrypoint (when CR22-ready).
- Verify report build flow for BASE domains: participant, unit, activity, scan.
- Verify template save/reload behavior and ownership/access rules.
- Verify export behavior for permitted users.
- Verify deferred gating behavior is explicit when CR22 is not yet ready.

## Expected outcomes

- BA15 uses shared reporting contracts instead of BASE-local reporting assumptions.
- Domain explores and event scope are correctly applied.
- If CR22 is not ready, slice remains deferred with clear operator messaging.

## Edge cases

- Missing field metadata in catalog for selected domain.
- Loading template referencing removed/renamed fields.
- User with view permission but no template write permission.

## Pass/fail evidence fields

| Field | Evidence |
| --- | --- |
| Tester |  |
| Date |  |
| Environment |  |
| CR22 status |  |
| Scenario IDs passed |  |
| Scenario IDs failed |  |
| Evidence links (screenshots/video/logs) |  |
| Defects filed |  |
| Retest result |  |

## Reviewer notes

- Notes:
- Follow-ups:

## Sign-off summary

- Final result: [Pass/Fail/Blocked/Deferred]
- Reviewer:
