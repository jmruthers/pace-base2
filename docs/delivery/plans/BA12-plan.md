# Delivery Plan: BA12 Scanning Setup

## Plan metadata

- Slice ID: BA12
- Requirement source: `docs/requirements/BA12-scanning-setup_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: BA01, BA09
- Blocks slices: BA13, BA14, BA16
- Backend readiness required: Yes
- Safe for unattended execution: Backend-ready only

## Requirement alignment

- Requirement summary:
  - Deliver scan-point setup and scanning administration route at `/scanning`.
  - Define manifest download and setup governance contracts.
  - Keep queue/sync semantics out of BA12 ownership (owned by BA14).
- In-scope implementation for this plan: scan-point setup UI, manifest entrypoints, setup-level access controls.
- Out-of-scope for this plan: runtime scan ingestion logic and sync reconciliation algorithms.
- Acceptance criteria covered: setup ownership boundaries, scan-point modeling, admin/operator setup UX.

## Current state audit

- Existing app behavior: scanning setup is new rebuild capability.
- Existing relevant code paths: scanning setup route and scan-point configuration components.
- Existing backend contracts in use: `base_scan_point` and supporting event/activity context tables.
- Known gaps to target behavior: explicit setup-vs-sync ownership boundaries and manifest contract coverage.

## Backend contract readiness check

- Required contracts for this slice:
  - Scan-point configuration read/write contract -> Needs change
  - Manifest download contract -> Needs change
  - Setup access controls -> Missing
- Verification evidence links: `docs/requirements/BA12-scanning-setup_requirements.md`, `docs/requirements/BA00-base-architecture.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Build `/scanning` setup surfaces and scan-point management flow.
  - Files/areas: scanning setup route and forms.
  - Notes: consume BA01 event and BA09 activity context.
- Task 2: Implement manifest access/download entrypoints.
  - Files/areas: manifest controls and setup actions.
  - Notes: keep sync behavior out of this slice.
- Task 3: Add setup and access control tests.
  - Files/areas: scanning setup tests.
  - Notes: include invalid config and denied-role paths.

## Acceptance traceability

- Setup ownership criterion -> `/scanning` setup flow -> scan-point CRUD tests
- Manifest criterion -> manifest entrypoints -> manifest access tests
- Boundary criterion -> setup-only scope enforcement -> no-sync-behavior tests

## Test and validation plan

- Unit/integration tests to add or update: scan-point validation tests, manifest tests, permission tests.
- Manual QA pack target: `docs/delivery/test-packs/BA12-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: setup layer quietly introduces sync/reconciliation behavior.
  - Mitigation: enforce slice ownership constraints in task and tests.
- Blocker conditions (must stop unattended execution):
  - Missing scan-point/manifest backend contracts.
  - BA01 or BA09 dependencies unresolved.

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
- Next action for operator/Cursor: confirm BA12 setup and manifest backend contracts.
- Resume pointer if interrupted: restart BA12 with setup contract verification and dependency check.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA12-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA12-scanning-setup_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
