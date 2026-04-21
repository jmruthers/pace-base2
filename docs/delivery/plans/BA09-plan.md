# Delivery Plan: BA09 Activity Offering And Session Setup

## Plan metadata

- Slice ID: BA09
- Requirement source: `docs/requirements/BA09-activity-offering-and-session-setup_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: BA01
- Blocks slices: BA10, BA11, BA12
- Backend readiness required: Yes
- Safe for unattended execution: Backend-ready only

## Requirement alignment

- Requirement summary:
  - Deliver activity offering and session setup for organisers.
  - Define booking windows, capacity, and schedule metadata for downstream booking/oversight.
  - Keep participant booking UI ownership out of BASE.
- In-scope implementation for this plan: `/activities`, `/activities/:offeringId`, offering/session CRUD contracts.
- Out-of-scope for this plan: participant booking experience and booking operations.
- Acceptance criteria covered: offering/session separation, setup completeness, event-scoped management.

## Current state audit

- Existing app behavior: activity setup is mostly new rebuild scope.
- Existing relevant code paths: activity routes, offering/session editors, event-scoped lookups.
- Existing backend contracts in use: `base_activity_offering`, `base_activity_session`.
- Known gaps to target behavior: robust setup UX and contract coverage for downstream booking rules.

## Backend contract readiness check

- Required contracts for this slice:
  - Offering/session read/write contracts -> Needs change
  - Capacity/window constraints contract -> Needs change
  - Event-scoped access rules -> Present
- Verification evidence links: `docs/requirements/BA09-activity-offering-and-session-setup_requirements.md`, `docs/requirements/BA00-base-architecture.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Build offering and session management routes.
  - Files/areas: `/activities`, `/activities/:offeringId`.
  - Notes: preserve organiser/operator scope only.
- Task 2: Implement capacity/window and session validation workflows.
  - Files/areas: offering/session forms and constraints.
  - Notes: align with downstream BA10/BA11 consumers.
- Task 3: Add setup and permission tests.
  - Files/areas: activity setup test suites.
  - Notes: include invalid schedule/capacity cases.

## Acceptance traceability

- Setup criterion -> offering/session routes -> CRUD tests
- Constraint criterion -> setup validators -> capacity/window tests
- Scope criterion -> permission guards -> denied-state tests

## Test and validation plan

- Unit/integration tests to add or update: offering/session validation tests, permission tests.
- Manual QA pack target: `docs/delivery/test-packs/BA09-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: setup semantics under-specified for downstream booking behavior.
  - Mitigation: document explicit output contracts consumed by BA10/BA11.
- Blocker conditions (must stop unattended execution):
  - Missing backend offering/session constraint contracts.
  - BA01 event workspace dependency unresolved.

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
- Next action for operator/Cursor: complete BA09 backend setup contracts and confirm BA01 dependency readiness.
- Resume pointer if interrupted: resume BA09 at constraint contract verification before route implementation.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA09-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA09-activity-offering-and-session-setup_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
