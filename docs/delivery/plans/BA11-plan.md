# Delivery Plan: BA11 Activity Booking Operations And Oversight

## Plan metadata

- Slice ID: BA11
- Requirement source: `docs/requirements/BA11-activity-booking-operations-and-oversight_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: BA09, BA10
- Blocks slices: BA13, BA16, BA15
- Backend readiness required: Yes
- Safe for unattended execution: Backend-ready only

## Requirement alignment

- Requirement summary:
  - Deliver organiser booking operations and oversight at `/activities/bookings`.
  - Consume stable setup + participant booking contracts from BA09/BA10.
  - Support operational visibility and controlled interventions.
- In-scope implementation for this plan: booking oversight views, operational actions, audit-friendly operator tooling.
- Out-of-scope for this plan: participant booking UI and setup definition workflows.
- Acceptance criteria covered: oversight completeness, operational actions, event-scoped permissions.

## Current state audit

- Existing app behavior: oversight workflow is largely net-new in rebuild.
- Existing relevant code paths: activity booking operations route and booking state readers.
- Existing backend contracts in use: booking read models and status contracts.
- Known gaps to target behavior: robust oversight actions and operational diagnostics.

## Backend contract readiness check

- Required contracts for this slice:
  - Booking operations projection contract -> Needs change
  - Oversight action contract -> Needs change
  - Operational audit/read permissions -> Missing
- Verification evidence links: `docs/requirements/BA11-activity-booking-operations-and-oversight_requirements.md`, `docs/requirements/BA00-base-architecture.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Build `/activities/bookings` operational dashboard and filters.
  - Files/areas: oversight route and booking operations components.
  - Notes: consume BA09+BA10 contracts.
- Task 2: Implement operational action flows with explicit permission checks.
  - Files/areas: action controls and mutation adapters.
  - Notes: keep actions auditable.
- Task 3: Add oversight and role access tests.
  - Files/areas: operations integration tests.
  - Notes: include invalid action and denied-role paths.

## Acceptance traceability

- Oversight criterion -> operations dashboard -> list/filter tests
- Action criterion -> action adapters and controls -> mutation behavior tests
- Permission criterion -> guarded operations -> role-denied tests

## Test and validation plan

- Unit/integration tests to add or update: booking operations tests, action tests, access tests.
- Manual QA pack target: `docs/delivery/test-packs/BA11-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: BA10 booking rule ambiguity propagates into oversight actions.
  - Mitigation: lock BA11 inputs to BA10-approved booking state model.
- Blocker conditions (must stop unattended execution):
  - Missing backend operations projection/action contracts.
  - BA09 or BA10 dependencies unresolved.

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
- Next action for operator/Cursor: clear BA11 backend projection/action readiness and dependency gating.
- Resume pointer if interrupted: restart BA11 from operations contract verification matrix.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA11-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA11-activity-booking-operations-and-oversight_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
