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

## UI verification

- On `/forms`, do not show a duplicate in-page event scope line when event context is already displayed in the shell header.
- On `/forms`, display each form as its own card.
- On `/forms`, provide both add-new and edit-existing form actions.
- On `/form-builder`, do not show a duplicate in-page event scope line when event context is already displayed in the shell header.
- On `/form-builder`, display builder fields in a two-column layout.
- On `/form-builder`, use a select control for access mode options.
- On `/form-builder`, use the `@solvera/pace-core` `SaveActions` primary save button.

## Testing feedback

- On the /forms page
    - Resolved: edit saves now send stable `form_id`, so changing slug updates the same form record.
    - Resolved: `Add new form` is presented as a button.
    - Resolved: Preview and Share links route to in-shell BA03 surfaces instead of not-found.

### Retest checklist

- Edit an existing form, change slug, save, and verify only one form record exists for that form id.
- Confirm `/forms` shows `Add new form` as a button control.
- Open Preview and Share from `/forms` and verify both routes load without not-found.


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
