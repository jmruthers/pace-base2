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

## Testing feedback

- Resolved: duplicate in-page event identifiers removed where they repeated the shell header (registration policy surface and related shell landing copy).
- Resolved: primary registration policy fields use a two-column layout on medium and larger breakpoints.
- Resolved: policy save uses `SaveActions` from `@solvera/pace-core` (approved primary save control).
- Resolved: registration scope is a select with the contract options (`open`, `hierarchy`, `org_only`, `invite_only`, `closed`).
- Resolved: `/registration-types` reads event-scoped rows from `base_registration_type` and saves through `app_base_registration_policy_upsert` with a JSON `requirements` object (`eligibility_rules`, `requirement_rules` with `check_type` / `sort_order` / `is_automated`) matching the pace-core2 contract—no direct client table writes for policy mutations.

### Retest checklist

- Confirm `/registration-types` does not show a redundant event id line when an event is selected in the header.
- Resize to a medium viewport or wider and confirm policy fields lay out in two columns.
- Save a policy and confirm the primary control is the shared `SaveActions` save affordance.
- Confirm registration scope is chosen from the select and matches one of the five contract values.
- After a successful save, confirm the registration type name appears in the in-page list sourced from `base_registration_type` (or use the network panel to confirm `app_base_registration_policy_upsert` and a follow-up read on the same event).

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
