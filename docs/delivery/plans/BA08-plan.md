# Delivery Plan: BA08 Units And Group Coordination

## Plan metadata

- Slice ID: BA08
- Requirement source: `docs/requirements/BA08-units-and-group-coordination_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: BA06
- Blocks slices: BA10, BA16, BA15
- Backend readiness required: Yes
- Safe for unattended execution: Backend-ready only

## Requirement alignment

- Requirement summary:
  - Deliver unit hierarchy and role assignment management.
  - Add sub-unit activity preference submission as a distinct contract.
  - Keep preference modeling separate from booking allocation logic.
- In-scope implementation for this plan: `/units`, `/unit-preferences`, role and preference workflows.
- Out-of-scope for this plan: automatic booking allocation and participant booking UI.
- Acceptance criteria covered: unit management, role assignment, preference ranking contract.

## Current state audit

- Existing app behavior: legacy `/units` supports part of hierarchy/roles; preferences are not fully realized.
- Existing relevant code paths: units route, role assignment forms, preference UX.
- Existing backend contracts in use: `base_units`, `base_unit_roles`, `base_activity_preference`.
- Known gaps to target behavior: explicit preference workflow and event-scoped rule enforcement.

## Backend contract readiness check

- Required contracts for this slice:
  - Unit CRUD and role contracts -> Present
  - Preference submission/rank contract -> Needs change
  - Role-scoped access controls -> Needs change
- Verification evidence links: `docs/requirements/BA08-units-and-group-coordination_requirements.md`, `docs/requirements/BA00-base-architecture.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Rebuild unit hierarchy and role assignment flows.
  - Files/areas: `/units` pages and role management components.
  - Notes: consume BA06 application context.
- Task 2: Implement `/unit-preferences` ranking and submission workflow.
  - Files/areas: preference screens and validation model.
  - Notes: keep preferences distinct from allocations.
- Task 3: Add preference/order and permission tests.
  - Files/areas: units + preferences test suites.
  - Notes: include invalid ranking and lock-state paths.

## Acceptance traceability

- Unit/role criterion -> `/units` management -> hierarchy and role tests
- Preference ranking criterion -> `/unit-preferences` workflow -> rank/order tests
- Permission criterion -> role-based guards -> denied-state tests

## Test and validation plan

- Unit/integration tests to add or update: unit CRUD tests, role tests, preference ranking tests.
- Manual QA pack target: `docs/delivery/test-packs/BA08-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: preferences incorrectly treated as immediate allocation actions.
  - Mitigation: enforce clear contract separation and no auto-allocation behavior.
- Blocker conditions (must stop unattended execution):
  - Missing preference submission contract details.
  - BA06 dependency not complete.

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
- Next action for operator/Cursor: verify preference and access contracts, then execute BA08.
- Resume pointer if interrupted: restart with BA08 preference contract validation and dependency check.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA08-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA08-units-and-group-coordination_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
