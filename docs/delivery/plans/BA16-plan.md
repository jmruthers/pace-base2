# Delivery Plan: BA16 Scanning Tracking Dashboard

## Plan metadata

- Slice ID: BA16
- Requirement source: `docs/requirements/BA16-scanning-tracking-dashboard_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: BA08, BA11, BA12, BA13, BA14
- Blocks slices: None
- Backend readiness required: Yes
- Safe for unattended execution: Backend-ready only

## Requirement alignment

- Requirement summary:
  - Deliver tracking dashboard at `/scanning/tracking`.
  - Provide operational visibility for on-site/off-site/never-scanned views.
  - Consume stabilized scan + sync + booking + unit contracts.
- In-scope implementation for this plan: tracking route, dashboards, derived-state views and filters.
- Out-of-scope for this plan: runtime scanning actions and sync ownership.
- Acceptance criteria covered: tracking data correctness, operational segmentation, role-scoped access.

## Current state audit

- Existing app behavior: tracking dashboard is new rebuild capability.
- Existing relevant code paths: tracking route placeholder and reporting adapters.
- Existing backend contracts in use: scan events, booking context, unit context, sync outcomes.
- Known gaps to target behavior: reliable derived-state definitions and cross-domain read aggregation.

## Backend contract readiness check

- Required contracts for this slice:
  - Tracking read projection contract -> Missing
  - Never-scanned derivation contract -> Needs change
  - Role-scoped tracking access contract -> Needs change
- Verification evidence links: `docs/requirements/BA16-scanning-tracking-dashboard_requirements.md`, `docs/requirements/BA00-base-architecture.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Build `/scanning/tracking` dashboard shell and segmented views.
  - Files/areas: tracking route and dashboard components.
  - Notes: depends on BA08/BA11/BA12/BA13/BA14 outputs.
- Task 2: Implement derivation logic for on-site/off-site/never-scanned states.
  - Files/areas: tracking query adapters and transformations.
  - Notes: enforce canonical “never scanned” definition.
- Task 3: Add tracking derivation and permission tests.
  - Files/areas: dashboard integration tests.
  - Notes: include stale/partial data edge cases.

## Acceptance traceability

- Dashboard criterion -> tracking route and views -> rendering/filter tests
- Derivation criterion -> tracking transforms -> state derivation tests
- Access criterion -> role gates + projection limits -> denied/role tests

## Test and validation plan

- Unit/integration tests to add or update: tracking derivation tests, filter tests, access tests.
- Manual QA pack target: `docs/delivery/test-packs/BA16-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: inconsistent “never scanned” interpretation across views.
  - Mitigation: encode canonical definition in query adapters + tests.
- Blocker conditions (must stop unattended execution):
  - Missing tracking projection contract.
  - Any upstream scanning dependency unresolved.

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
- Next action for operator/Cursor: verify tracking projection contract and upstream slice readiness.
- Resume pointer if interrupted: resume BA16 at dependency readiness + tracking derivation verification.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA16-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA16-scanning-tracking-dashboard_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
