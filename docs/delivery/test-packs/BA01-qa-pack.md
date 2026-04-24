# Manual QA Pack: BA01 Event Workspace And Configuration

## Slice metadata

- Slice ID: BA01
- Requirement source: `docs/requirements/BA01-event-workspace-and-configuration_requirements.md`
- Depends on: BA00

## Preconditions/environment

- Event with editable configuration data.
- Organiser user with config update permission.
- Read-only/denied user for permission checks.

## Scenario list

- Verify `/event-dashboard` loads selected event details and operational entrypoints.
- Verify `/configuration` loads approved editable event fields.
- Verify configuration save succeeds for valid payload including `registration_scope`.
- Verify read-only/denied states for users without update permission.
- Verify logo/file section behavior aligns with event context and refreshes correctly.

## Expected outcomes

- Event workspace is event-scoped and separate from feature routes.
- Only approved business-facing fields are editable.
- `registration_scope` is visible and saved via documented contract.
- Permission failures are explicit and non-silent.

## Edge cases

- Missing selected-event context on first load.
- Invalid field payload or schema mismatch from UI.
- Concurrent edits by two users causing stale update conflict.

## Test feedback

- One the event configuration page:
    - Display the fields in a two column grid
    - Event date should use the pae-core date field with date picker
    - Remove the Event colours field
    - Ensure the Description field label and input box are positioned and sized similarly to all the other fields
    - Save configuration button should just show "Save" and the button should appear at the bottom right corner of the card (currently bottom left). pace-core has created a new primitive and eslint rule for this - please implement per their directive.
    - When I try to make a change and save, I get this error in the UI:
        Configuration update failed: column core_events.id does not exist
      And this error in the console:
        XHRPATCH
        https://rkytnffgmwnnmewevqgp.supabase.co/rest/v1/core_events?id=eq.c6e3bd79-209b-446f-a403-7e95db1a1581
        [HTTP/3 400  56ms]

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
