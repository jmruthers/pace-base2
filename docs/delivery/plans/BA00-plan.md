# Delivery Plan: BA00 App Shell And Access

## Plan metadata

- Slice ID: BA00
- Requirement source: `docs/requirements/BA00-app-shell-and-access_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: None
- Blocks slices: BA01, BA03
- Backend readiness required: No
- Safe for unattended execution: Yes

## Requirement alignment

- Requirement summary:
  - Establish authenticated BASE shell boundaries and route ownership.
  - Keep `/login` outside shell and own `/` + `*` inside shell boundary.
  - Enforce shared auth/RBAC/provider contracts for all downstream slices.
- In-scope implementation for this plan: shell bootstrapping, guarded route structure, navigation derivation, denied and not-found behaviors.
- Out-of-scope for this plan: feature workflows from BA01+ and any backend schema/RPC changes.
- Acceptance criteria covered: shell boundary, route ownership, navigation parity, guard behavior.

## Current state audit

- Existing app behavior: legacy single-route composition with mixed ownership and legacy import assumptions.
- Existing relevant code paths: app routing/bootstrap, shell layout composition, login surface, guard wrappers.
- Existing backend contracts in use: auth/session, RBAC page permission checks, event/org context reads.
- Known gaps to target behavior: navigation ownership normalization, scoped `@solvera/pace-core` usage, explicit shell boundary hardening.

## Backend contract readiness check

- Required contracts for this slice:
  - Auth/session bootstrap contract -> Present
  - Route guard + RBAC read contract -> Present
  - Event/org context read contract -> Present
- Verification evidence links: `docs/requirements/BA00-app-shell-and-access_requirements.md`, `docs/requirements/BA00-base-architecture.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Rebuild shell route boundary and shared provider composition.
  - Files/areas: `src/App.tsx`, shell/bootstrap modules, route ownership registry.
  - Notes: keep participant-facing journeys out of BASE app routes.
- Task 2: Align navigation and permission handling to architecture-owned route map.
  - Files/areas: layout/nav derivation and page guard integration.
  - Notes: no local parallel route ownership tables.
- Task 3: Add denied/not-found handling parity tests for shell boundary.
  - Files/areas: routing and guard tests.
  - Notes: verify `/login`, `/`, and `*` scenarios explicitly.

## Acceptance traceability

- Criterion -> implementation area(s) -> test(s):
  - Shell boundary and ownership -> routing/bootstrap + layout -> route rendering and guard tests
  - Navigation parity -> nav derivation + permissions -> visibility and denied-state tests
  - Catch-all handling -> `*` route + fallback UI -> unknown-route tests

## Test and validation plan

- Unit/integration tests to add or update: route composition tests, guard behavior tests, nav parity tests.
- Manual QA pack target: `docs/delivery/test-packs/BA00-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: hidden legacy route ownership duplication reappears in feature modules.
  - Mitigation: enforce single route ownership source in shell bootstrap.
- Blocker conditions (must stop unattended execution):
  - Missing/unstable auth or RBAC contract behavior.
  - Requirement/architecture conflict on shell route ownership.

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
- Queue status recommendation: Ready
- Next action for operator/Cursor: Execute BA00 as first build-queue slice.
- Resume pointer if interrupted: Resume from BA00 route/bootstrap task sequence and rerun quality gates.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA00-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA00-app-shell-and-access_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): N/A (read-contract baseline)
