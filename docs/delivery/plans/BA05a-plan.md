# Delivery Plan: BA05a Registration Entry And Application Submission

## Plan metadata

- Slice ID: BA05a
- Requirement source: `docs/requirements/BA05a-registration-entry-and-application-submission_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: BA02, BA03, BA04
- Blocks slices: BA05b, BA06, BA07, BA10
- Backend readiness required: Yes
- Safe for unattended execution: No

## Requirement alignment

- Requirement summary:
  - Deliver registration entrypoint and submission workflow contracts.
  - Ensure application creation and status transitions remain backend-owned.
  - Keep participant-facing journey UI in pace-portal while BASE owns workflow contracts.
- In-scope implementation for this plan: BASE-side workflow contracts, organiser tooling touchpoints, submission orchestration interfaces.
- Out-of-scope for this plan: BASE-hosted participant registration pages.
- Acceptance criteria covered: status model, workflow transitions, registration-entrypoint mapping.

## Current state audit

- Existing app behavior: legacy client-side `base_application` write assumptions and incomplete approval workflow.
- Existing relevant code paths: registration entry and submission integrations, application contract adapters.
- Existing backend contracts in use: `app_base_application_create(...)`, registration type and check tables, forms response linkage.
- Known gaps to target behavior: full backend-owned transition sequencing and portal-hosted participant experience boundary.

## Backend contract readiness check

- Required contracts for this slice:
  - `app_base_application_create(...)` and scope checks -> Present
  - Application status progression and check activation -> Needs change
  - Magic-link token hash/expiry lifecycle -> Needs change
  - `base_form_registration_type` binding semantics -> Needs change
- Verification evidence links: `docs/requirements/BA05a-registration-entry-and-application-submission_requirements.md`, `docs/requirements/BA00-base-architecture.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Implement BASE contract adapters for registration submission workflow.
  - Files/areas: registration workflow services and organiser-facing support UI.
  - Notes: no direct privileged client writes.
- Task 2: Align entrypoint metadata and registration type selection paths.
  - Files/areas: form-entry binding and submission pre-check logic.
  - Notes: enforce authenticated-member baseline unless approved otherwise.
- Task 3: Add workflow transition and error-path tests.
  - Files/areas: workflow integration tests.
  - Notes: include no-requirement auto-advance and under-review paths.

## Acceptance traceability

- Backend-owned transition criterion -> submission workflow adapters -> transition tests
- Registration-entrypoint criterion -> form binding + type mapping -> entrypoint tests
- Portal ownership boundary criterion -> BASE contract-only surface -> route ownership assertions in docs/tests

## Test and validation plan

- Unit/integration tests to add or update: submission orchestration tests, status transition tests, permission tests.
- Manual QA pack target: `docs/delivery/test-packs/BA05a-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: workflow side effects leak into UI layer.
  - Mitigation: enforce service-layer adapters and RPC ownership boundaries.
- Blocker conditions (must stop unattended execution):
  - Missing backend status/check lifecycle contract.
  - Conflict on participant UI ownership (must remain pace-portal).

## Unattended execution readiness checklist

- [ ] Dependencies completed and verified
- [ ] Backend contracts verified or backend ready gate passed
- [ ] Plan tasks are deterministic and in scope
- [ ] Acceptance mapping is complete
- [ ] Test/validation plan is complete
- [ ] Blocker conditions are explicit
- [ ] Slice can run without cross-slice scope expansion

## Build queue handoff

- Queue file: `docs/delivery/build-queue.md`
- Queue status recommendation: Blocked
- Next action for operator/Cursor: complete BA05a backend deltas and confirm portal/BASE ownership contract.
- Resume pointer if interrupted: resume from BA05a contract readiness checks and workflow transition matrix verification.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA05a-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA05a-registration-entry-and-application-submission_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
