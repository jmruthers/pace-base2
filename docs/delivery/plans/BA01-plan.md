# Delivery Plan: BA01 Event Workspace And Configuration

## Plan metadata

- Slice ID: BA01
- Requirement source: `docs/requirements/BA01-event-workspace-and-configuration_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: BA00
- Blocks slices: BA03, BA04, BA09, BA12
- Backend readiness required: Yes
- Safe for unattended execution: Backend-ready only

## Requirement alignment

- Requirement summary:
  - Deliver event workspace entry surfaces (`/event-dashboard`, `/configuration`).
  - Keep event configuration aligned to validated `core_events` contract.
  - Preserve event-scoped permissions and registration-scope visibility.
- In-scope implementation for this plan: event dashboard, configuration form, event context handoff and permission handling.
- Out-of-scope for this plan: registration/application workflows and non-event feature routes.
- Acceptance criteria covered: event workspace separation, configuration field scope, registration scope behavior.

## Current state audit

- Existing app behavior: legacy dashboard/config pages with direct client writes and partial field-shape drift.
- Existing relevant code paths: dashboard route, configuration route, event context consumers, file/logo handling.
- Existing backend contracts in use: `core_events` read/write permissions, event context reads, RBAC checks.
- Known gaps to target behavior: contract-aligned field allowlist, registration_scope handling, permission-denied parity.

## Backend contract readiness check

- Required contracts for this slice:
  - `core_events` approved field contract -> Needs change
  - Event configuration write permission contract -> Present
  - Event/logo attachment contract -> Needs change
- Verification evidence links: `docs/requirements/BA01-event-workspace-and-configuration_requirements.md`, `docs/requirements/BA00-base-architecture.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Rebuild event workspace routes and selected-event handoff behavior.
  - Files/areas: dashboard/config routes and shell integration.
  - Notes: require BA00 shell completion first.
- Task 2: Implement contract-driven configuration form using approved field scope.
  - Files/areas: configuration form model/validation/mutation flow.
  - Notes: exclude system-managed fields.
- Task 3: Add permission and validation coverage for dashboard/configuration.
  - Files/areas: integration tests + denied-state tests.
  - Notes: include registration_scope read/write checks.

## Acceptance traceability

- Event workspace criterion -> dashboard route + event context wiring -> dashboard load tests
- Configuration field-scope criterion -> config form allowlist + mutation path -> form validation tests
- Permission criterion -> guard + mutation auth checks -> read/update denied-state tests

## Test and validation plan

- Unit/integration tests to add or update: config field allowlist tests, event context tests, RBAC update tests.
- Manual QA pack target: `docs/delivery/test-packs/BA01-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: event schema drift between docs and active dev-db shape.
  - Mitigation: lock to approved field contract and log deltas explicitly.
- Blocker conditions (must stop unattended execution):
  - Missing backend contract for required event configuration fields.
  - BA00 shell dependency incomplete.

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
- Next action for operator/Cursor: Validate backend event/config contracts and clear BA01 readiness blockers.
- Resume pointer if interrupted: Resume at BA01 backend contract verification before UI implementation.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA01-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA01-event-workspace-and-configuration_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
