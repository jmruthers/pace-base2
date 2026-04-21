# Manual QA Pack: BA16 Scanning Tracking Dashboard

## Slice metadata

- Slice ID: BA16
- Requirement source: `docs/requirements/BA16-scanning-tracking-dashboard_requirements.md`
- Depends on: BA08, BA11, BA12, BA13, BA14
- Scanning ownership note: BA16 covers tracking/operational projection.

## Preconditions/environment

- Recent scan events across accepted/rejected/conflict outcomes.
- Unit/activity/transport context data available.
- Operations user with tracking dashboard access.

## Scenario list

- Verify `/scanning/tracking` loads operational summaries and segment views.
- Verify on-site/off-site/never-scanned derivations match canonical definitions.
- Verify filtering/grouping by relevant operational dimensions.
- Verify dashboard refresh reflects recent scan/sync changes.
- Verify denied-state behavior for unauthorized users.

## Expected outcomes

- Tracking projections are consistent with persisted scan and sync contracts.
- “Never scanned” represents no recorded accepted/rejected attempt.
- Operational dashboard remains read-focused and non-destructive.

## Edge cases

- Partial sync completion creates temporarily inconsistent totals.
- Large event dataset causes delayed refresh response.
- Filter combinations that produce empty result sets.

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
