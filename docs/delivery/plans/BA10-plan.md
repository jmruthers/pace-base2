# Delivery Plan: BA10 Participant Activity Booking Experience

## Plan metadata

- Slice ID: BA10
- Requirement source: `docs/requirements/BA10-participant-activity-booking-experience_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: BA02, BA05a, BA08, BA09
- Blocks slices: BA11
- Backend readiness required: Yes
- Safe for unattended execution: No

## Requirement alignment

- Requirement summary:
  - Define participant activity booking workflow semantics and constraints.
  - Ensure booking rules (capacity, windows, conflict checks, source controls) are contract-driven.
  - Keep participant booking UI route ownership in pace-portal.
- In-scope implementation for this plan: booking contracts, BASE workflow services, organiser-facing support integrations.
- Out-of-scope for this plan: BASE-hosted participant booking pages.
- Acceptance criteria covered: booking rule enforcement, waitlist boundaries, workflow ownership split.

## Current state audit

- Existing app behavior: participant booking flow is new rebuild scope.
- Existing relevant code paths: booking service adapters and activity contract consumers.
- Existing backend contracts in use: offering/session/booking tables and booking status fields.
- Known gaps to target behavior: complete booking rules and participant-facing contract projection.

## Backend contract readiness check

- Required contracts for this slice:
  - Booking create/cancel/status contract -> Needs change
  - Capacity/window/conflict validation contract -> Needs change
  - Participant-safe booking projection contract -> Missing
- Verification evidence links: `docs/requirements/BA10-participant-activity-booking-experience_requirements.md`, `docs/requirements/BA00-base-architecture.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Implement BASE booking workflow adapters and contract mappers.
  - Files/areas: booking services and shared workflow models.
  - Notes: consume BA02/BA05a/BA08/BA09 outputs.
- Task 2: Implement organiser support views/actions needed by BA11 oversight.
  - Files/areas: booking admin support components.
  - Notes: participant UI remains portal-owned.
- Task 3: Add booking rule and permission-path tests.
  - Files/areas: booking integration tests.
  - Notes: include capacity full, conflict, and window-closed cases.

## Acceptance traceability

- Booking-rule criterion -> booking adapters and validators -> conflict/capacity/window tests
- Waitlist/MVP boundary criterion -> booking status model -> waitlist boundary tests
- Portal ownership boundary criterion -> BASE contract-only implementation -> route ownership assertions

## Test and validation plan

- Unit/integration tests to add or update: booking rule tests, status tests, permission tests.
- Manual QA pack target: `docs/delivery/test-packs/BA10-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: participant UI responsibilities bleed into BASE route ownership.
  - Mitigation: keep portal boundary explicit in plan/tasks/tests.
- Blocker conditions (must stop unattended execution):
  - Missing backend booking rule contracts.
  - Any attempt to define BASE participant booking routes.

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
- Next action for operator/Cursor: finish BA10 backend booking contracts and downstream projection readiness.
- Resume pointer if interrupted: restart BA10 from booking validation contract checklist.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA10-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA10-participant-activity-booking-experience_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
