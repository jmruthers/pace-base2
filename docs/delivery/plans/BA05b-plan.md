# Delivery Plan: BA05b Participant Application Progress

## Plan metadata

- Slice ID: BA05b
- Requirement source: `docs/requirements/BA05b-participant-application-progress_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: BA05a
- Blocks slices: None
- Backend readiness required: Yes
- Safe for unattended execution: Backend-ready only

## Requirement alignment

- Requirement summary:
  - Define participant application progress contract and status visibility rules.
  - Keep participant UI route ownership in pace-portal while BASE owns workflow semantics.
  - Ensure progress state reflects application/check lifecycle accurately.
- In-scope implementation for this plan: progress/read contracts, BASE workflow support surfaces, status detail mapping.
- Out-of-scope for this plan: BASE app participant progress pages.
- Acceptance criteria covered: progress visibility, status consistency, contract-driven behavior.

## Current state audit

- Existing app behavior: legacy progress experience is partial and not contract-complete.
- Existing relevant code paths: application read models and status surfaces.
- Existing backend contracts in use: `base_application`, `base_application_check` read contracts.
- Known gaps to target behavior: normalized status detail semantics and portal boundary enforcement.

## Backend contract readiness check

- Required contracts for this slice:
  - Application/check read contracts -> Needs change
  - Participant-safe progress projection contract -> Missing
  - Role-scoped visibility rules -> Needs change
- Verification evidence links: `docs/requirements/BA05b-participant-application-progress_requirements.md`, `docs/requirements/BA00-base-architecture.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Implement BASE-side progress projection and API adapters.
  - Files/areas: application progress service/read model.
  - Notes: consume BA05a workflow contracts.
- Task 2: Align progress status mapping and detail messaging.
  - Files/areas: status adapters + shared view model.
  - Notes: avoid inventing extra status enums.
- Task 3: Add progress and permission-path tests.
  - Files/areas: integration tests for participant-safe reads.
  - Notes: enforce data minimization by role.

## Acceptance traceability

- Progress visibility criterion -> participant progress projection -> status feed tests
- Status consistency criterion -> application/check mapper -> status derivation tests
- Portal ownership boundary criterion -> BASE contract-only implementation -> boundary checks in docs/tests

## Test and validation plan

- Unit/integration tests to add or update: progress mapper tests, role visibility tests, error-path tests.
- Manual QA pack target: `docs/delivery/test-packs/BA05b-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: mismatched interpretation of check-level outcomes.
  - Mitigation: lock progress model to BA05a + BA06 contract definitions.
- Blocker conditions (must stop unattended execution):
  - BA05a dependency unresolved.
  - Missing participant-safe projection contract.

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
- Next action for operator/Cursor: finalize BA05a + progress projection backend contract.
- Resume pointer if interrupted: restart BA05b readiness from dependency and projection contract checks.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA05b-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA05b-participant-application-progress_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
