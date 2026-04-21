# Delivery Plan: BA13 Scanning Runtime And Validation

## Plan metadata

- Slice ID: BA13
- Requirement source: `docs/requirements/BA13-scanning-runtime-and-validation_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: BA06, BA11, BA12
- Blocks slices: BA14, BA16
- Backend readiness required: Yes
- Safe for unattended execution: No

## Requirement alignment

- Requirement summary:
  - Deliver dedicated scanning runtime at `/scanning/:scanPointId`.
  - Implement validation-result semantics and manual/override pathways.
  - Keep runtime output compatible with BA14 ingest-only sync model.
- In-scope implementation for this plan: runtime scan UI, validation outcomes, manual scan and override behavior.
- Out-of-scope for this plan: sync reconciliation logic and tracking dashboards.
- Acceptance criteria covered: runtime flow correctness, validation reason mapping, operator-specific UX.

## Current state audit

- Existing app behavior: scanning runtime is net-new in rebuild.
- Existing relevant code paths: runtime route and scan action handling.
- Existing backend contracts in use: scan event persistence contracts and validation outcome fields.
- Known gaps to target behavior: complete validation mapping and offline/runtime handoff semantics.

## Backend contract readiness check

- Required contracts for this slice:
  - Live scan submission contract -> Needs change
  - Manual scan and override contract -> Needs change
  - Validation result/reason persistence contract -> Needs change
- Verification evidence links: `docs/requirements/BA13-scanning-runtime-and-validation_requirements.md`, `docs/requirements/BA00-base-architecture.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Build `/scanning/:scanPointId` runtime UI and operator interaction model.
  - Files/areas: runtime route and scan interaction components.
  - Notes: no admin-shell coupling.
- Task 2: Implement validation outcome mapping and manual/override actions.
  - Files/areas: runtime decision adapters.
  - Notes: preserve explicit result/reason mapping contract.
- Task 3: Add runtime path tests, including rejected and manual paths.
  - Files/areas: runtime integration tests.
  - Notes: include role and invalid state handling.

## Acceptance traceability

- Runtime flow criterion -> runtime route + controls -> scan runtime tests
- Validation mapping criterion -> result/reason adapters -> mapping tests
- Manual/override criterion -> operator action flows -> manual/override tests

## Test and validation plan

- Unit/integration tests to add or update: runtime decision tests, validation mapping tests, access tests.
- Manual QA pack target: `docs/delivery/test-packs/BA13-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: inconsistent validation mapping between runtime and persisted events.
  - Mitigation: codify mapping table in tests and service adapters.
- Blocker conditions (must stop unattended execution):
  - Missing validation result/reason contract.
  - BA06/BA11/BA12 dependencies unresolved.

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
- Next action for operator/Cursor: finalize BA13 validation and runtime submission contracts.
- Resume pointer if interrupted: restart at BA13 runtime contract and mapping verification checklist.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA13-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA13-scanning-runtime-and-validation_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
