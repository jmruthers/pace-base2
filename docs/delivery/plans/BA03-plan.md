# Delivery Plan: BA03 Forms Authoring And BASE Integration

## Plan metadata

- Slice ID: BA03
- Requirement source: `docs/requirements/BA03-forms-authoring-and-base-integration_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: BA00, BA01, BA02
- Blocks slices: BA04, BA05a
- Backend readiness required: Yes
- Safe for unattended execution: Backend-ready only

## Requirement alignment

- Requirement summary:
  - Deliver BASE form authoring surfaces on top of shared forms contracts.
  - Keep BASE integration bounded to authoring + workflow binding, not generic persistence side effects.
  - Align registration entrypoint integration with typed forms model.
- In-scope implementation for this plan: `/forms`, `/form-builder`, contract-driven binding flow, authoring permission model.
- Out-of-scope for this plan: participant registration UI ownership (portal) and registration workflow execution (BA05a+).
- Acceptance criteria covered: authoring scope, typed form integration, response-capture boundaries.

## Current state audit

- Existing app behavior: legacy authoring assumes old form schema and implicit backend behavior.
- Existing relevant code paths: forms list page, builder page, publish/preview flows, form submission adapters.
- Existing backend contracts in use: form definition and response tables, legacy RPC hooks.
- Known gaps to target behavior: typed workflow contract alignment and entrypoint binding semantics.

## Backend contract readiness check

- Required contracts for this slice:
  - BA02 typed forms contract -> Missing
  - Registration entrypoint binding contract -> Needs change
  - Form publish/read permissions -> Present
- Verification evidence links: `docs/requirements/BA03-forms-authoring-and-base-integration_requirements.md`, `docs/requirements/BA02-shared-forms-platform-contracts_requirements.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Rebuild forms list and authoring flow against BA02 contract.
  - Files/areas: `/forms`, authoring queries/mutations.
  - Notes: remove legacy coupling assumptions.
- Task 2: Rebuild builder interactions to semantic field identity and workflow typing.
  - Files/areas: `/form-builder`, field model/edit state.
  - Notes: no `table_name`/`column_name` dependency.
- Task 3: Add authoring and permission regression tests.
  - Files/areas: builder/list test suites.
  - Notes: include invalid schema and denied access cases.

## Acceptance traceability

- Authoring contract criterion -> forms pages + builder adapters -> authoring flow tests
- Typed field identity criterion -> builder field model -> field identity tests
- Permission criterion -> guard and mutation controls -> denied-state tests

## Test and validation plan

- Unit/integration tests to add or update: builder validation tests, publish-state tests, permission-path tests.
- Manual QA pack target: `docs/delivery/test-packs/BA03-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: partial BA02 rollout causes mixed schema assumptions in BA03.
  - Mitigation: enforce backend-ready gate for all BA03 contract touchpoints.
- Blocker conditions (must stop unattended execution):
  - BA02 contract not finalized.
  - Missing registration entrypoint binding contract behavior.

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
- Next action for operator/Cursor: Complete BA02 contract readiness and then run BA03 route-level implementation.
- Resume pointer if interrupted: Resume at BA03 contract verification checklist before builder changes.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA03-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA03-forms-authoring-and-base-integration_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
