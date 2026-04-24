# Manual QA Pack: BA02 Shared Forms Platform Contracts

## Slice metadata

- Slice ID: BA02
- Requirement source: `docs/requirements/BA02-shared-forms-platform-contracts_requirements.md`
- Depends on: None
- Route ownership: Contract-only (no dedicated BASE route)
- Suggested manual surfaces: BA02 does not mandate BASE routes. For UI smoke checks of the same contracts, use BA03 entrypoints `/forms` and `/form-builder` (see `docs/delivery/test-packs/BA03-qa-pack.md`).
- Beyond those pages: submission, deny-path, and “no generic table/column write” checks may require RPC/API or other apps—use whatever exposes the shared forms contract in your environment.

## Preconditions/environment

- Backend contracts for typed workflows available in test environment.
- Author role and submitter role accounts available.
- Sample workflows for `base_registration`, `information_collection`, and `generic`.

## Scenario list

- Verify a form can be authored with valid `workflow_type` and `access_mode`.
- Verify fields are identified by `field_key` and persist/reload stably.
- Verify submission links response to workflow subject (`workflow_subject_type/id`).
- Verify unauthorized author/submit actions are denied by contract.
- Verify no generic table/column write behavior is exposed to consumers.

## Expected outcomes

- Shared forms contract is workflow-typed and reusable across apps.
- Response capture is decoupled from downstream workflow side effects.
- Invalid workflow metadata or payload shapes fail predictably.

## Edge cases

- Unsupported workflow type submitted.
- Duplicate or malformed `field_key` values.
- Authoring valid form but submitter role lacks required access mode.

## Test feedback

- UI feedback for `/forms` and `/form-builder` is owned by BA03 and tracked in `docs/delivery/test-packs/BA03-qa-pack.md`.
- Keep BA02 manual testing focused on shared forms contract behavior rather than BASE route presentation.

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
