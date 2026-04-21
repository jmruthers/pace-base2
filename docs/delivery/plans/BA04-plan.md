# Delivery Plan: BA04 Registration Setup And Policy

## Plan metadata

- Slice ID: BA04
- Requirement source: `docs/requirements/BA04-registration-setup-and-policy_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: BA01, BA02, BA03
- Blocks slices: BA05a, BA06, BA07
- Backend readiness required: Yes
- Safe for unattended execution: Backend-ready only

## Requirement alignment

- Requirement summary:
  - Define registration types, eligibility, and requirement policy setup.
  - Align policy behavior with event scope and shared forms entrypoint contracts.
  - Establish admin/operator setup surfaces for downstream registration flows.
- In-scope implementation for this plan: `/registration-types` policy management, requirement ordering, eligibility settings.
- Out-of-scope for this plan: participant submission/progress UI and approval token UI ownership.
- Acceptance criteria covered: registration setup completeness, eligibility modeling, explicit policy contract.

## Current state audit

- Existing app behavior: limited or absent legacy setup tooling for full policy model.
- Existing relevant code paths: registration type route, policy forms, event-level config hooks.
- Existing backend contracts in use: registration type and requirement tables, event scope checks.
- Known gaps to target behavior: requirement sequencing, policy-to-application contract linkage, robust admin workflows.

## Backend contract readiness check

- Required contracts for this slice:
  - Registration type CRUD contract -> Needs change
  - Eligibility and requirement ordering contract -> Needs change
  - Event scope policy contract -> Present
- Verification evidence links: `docs/requirements/BA04-registration-setup-and-policy_requirements.md`, `docs/requirements/BA00-base-architecture.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Build registration type management UI and event-scoped policy workflow.
  - Files/areas: `/registration-types`, policy forms/state.
  - Notes: gate on BA01-BA03 completion.
- Task 2: Implement requirement ordering and eligibility configuration UX.
  - Files/areas: policy detail forms and validation.
  - Notes: keep transitions backend-owned.
- Task 3: Add integration tests for setup, edit, and denied-state flows.
  - Files/areas: registration policy tests.
  - Notes: include invalid policy payload coverage.

## Acceptance traceability

- Registration setup criterion -> `/registration-types` management flow -> CRUD tests
- Eligibility/order criterion -> policy requirement model -> ordering validation tests
- Permission criterion -> guarded admin operations -> denied-state tests

## Test and validation plan

- Unit/integration tests to add or update: policy validation tests, ordering tests, permission tests.
- Manual QA pack target: `docs/delivery/test-packs/BA04-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: policy model ambiguity causes downstream workflow drift.
  - Mitigation: bind BA04 outputs explicitly into BA05a/BA06/BA07 plans.
- Blocker conditions (must stop unattended execution):
  - Missing backend policy/eligibility contracts.
  - BA02/BA03 dependencies not at backend-ready state.

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
- Next action for operator/Cursor: clear BA04 backend deltas and dependency readiness from BA01-BA03.
- Resume pointer if interrupted: restart from BA04 backend contract checklist and policy data model verification.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA04-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA04-registration-setup-and-policy_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
