# Manual QA Pack: BA00 App Shell And Access

## Slice metadata

- Slice ID: BA00
- Requirement source: `docs/requirements/BA00-app-shell-and-access_requirements.md`
- Depends on: None

## Preconditions/environment

- Test user with organiser/operator permissions.
- Test user without required page permission.
- BASE app running with valid auth provider configuration.

## Scenario list

- Verify `/login` renders outside authenticated shell.
- Verify authenticated `/` shell landing renders expected navigation and layout.
- Verify unauthorized access to protected route redirects/denies correctly.
- Verify unknown route (`*`) renders BASE not-found state inside shell.
- Verify logout clears session and returns to login boundary.

## Expected outcomes

- Login/public boundary remains separate from shell.
- Route guard behavior follows shared auth/RBAC contracts.
- Navigation only shows slice-owned accessible routes.
- Unknown routes do not expose feature state or crash.

## Edge cases

- Expired session token during navigation.
- User has shell access but no page-level permission.
- Deep-link to protected route before session restoration completes.

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
