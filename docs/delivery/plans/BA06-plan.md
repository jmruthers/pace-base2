# Delivery Plan: BA06 Applications Admin And Review

## Plan metadata

- Slice ID: BA06
- Requirement source: `docs/requirements/BA06-applications-admin-and-review_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: BA04, BA05a
- Blocks slices: BA08, BA13, BA15
- Backend readiness required: Yes
- Safe for unattended execution: Backend-ready only

## Requirement alignment

- Requirement summary:
  - Deliver organiser/admin application review operations at `/applications`.
  - Support review state transitions and check visibility with backend-owned logic.
  - Preserve override and auditability semantics for manual decisions.
- In-scope implementation for this plan: admin review list/detail, state transition actions, check visibility and audit UX.
- Out-of-scope for this plan: participant journey UI and token approval page ownership.
- Acceptance criteria covered: admin review completeness, status transition correctness, permission boundaries.

## Current state audit

- Existing app behavior: legacy `/applications` supports only partial read/admin workflows.
- Existing relevant code paths: application list/detail views and review actions.
- Existing backend contracts in use: application/check tables and status contracts.
- Known gaps to target behavior: full review workflow support and explicit override semantics.

## Backend contract readiness check

- Required contracts for this slice:
  - Application review read/write contracts -> Needs change
  - Check progression visibility contract -> Needs change
  - Admin override/audit contract -> Missing
- Verification evidence links: `docs/requirements/BA06-applications-admin-and-review_requirements.md`, `docs/requirements/BA00-base-architecture.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Rebuild `/applications` review flow against backend-owned transitions.
  - Files/areas: applications route list/detail/actions.
  - Notes: dependency on BA04/BA05a.
- Task 2: Implement check visibility, unresolved requirement display, and override pathways.
  - Files/areas: review detail and action components.
  - Notes: keep unresolved checks visible post-override.
- Task 3: Add review transition and permission tests.
  - Files/areas: review integration tests.
  - Notes: include denied/invalid transition cases.

## Acceptance traceability

- Review operations criterion -> applications admin pages -> list/detail action tests
- Transition correctness criterion -> review action adapters -> transition validation tests
- Permission criterion -> guarded actions + role checks -> denied-state tests

## Test and validation plan

- Unit/integration tests to add or update: admin review tests, transition tests, audit visibility tests.
- Manual QA pack target: `docs/delivery/test-packs/BA06-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: manual override behavior diverges from documented workflow.
  - Mitigation: enforce explicit override contract in backend backlog and tests.
- Blocker conditions (must stop unattended execution):
  - Missing review transition RPC/contract.
  - Unresolved audit trail requirements.

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
- Next action for operator/Cursor: complete backend review/override contract readiness.
- Resume pointer if interrupted: restart BA06 from review transition contract verification.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA06-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA06-applications-admin-and-review_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
