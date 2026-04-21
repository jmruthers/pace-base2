# Manual QA Pack: BA05a Registration Entry And Application Submission

## Slice metadata

- Slice ID: BA05a
- Requirement source: `docs/requirements/BA05a-registration-entry-and-application-submission_requirements.md`
- Depends on: BA02, BA03, BA04
- Boundary note: BASE owns contracts/workflow; participant UI is pace-portal owned.

## Preconditions/environment

- Registration type and policy configured.
- Registration entrypoint form mapped to registration type(s).
- Applicant account and organiser reviewer account.

## Scenario list

- Verify fixed-type and open-selection registration entrypoint resolution.
- Verify submission captures form response then creates application via backend contract.
- Verify status progression for no-check flow (direct approval path where applicable).
- Verify status progression for check-required flow (`under_review` with first check activation).
- Verify organiser tooling can inspect submission contract outputs without BASE participant route ownership.

## Expected outcomes

- Application creation is backend-owned and policy-aware.
- Scope checks and registration type rules are enforced on submit.
- Participant route ownership remains in pace-portal; BASE does not host duplicate participant journey.

## Edge cases

- Submission with disallowed registration type for selected entrypoint.
- Missing required referee/guardian details when required by type.
- Duplicate submit attempt for same workflow subject.

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
