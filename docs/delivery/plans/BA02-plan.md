# Delivery Plan: BA02 Shared Forms Platform Contracts

## Plan metadata

- Slice ID: BA02
- Requirement source: `docs/requirements/BA02-shared-forms-platform-contracts_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: None
- Blocks slices: BA03, BA04, BA05a, BA10
- Backend readiness required: Yes
- Safe for unattended execution: No

## Requirement alignment

- Requirement summary:
  - Define typed forms-platform contracts and semantic field identity.
  - Replace generic table/column write assumptions with workflow-bound contracts.
  - Align BASE consumption with upstream CR21 forms-runtime authority.
- In-scope implementation for this plan: contract alignment work, shared forms schema/RPC backlog definition, BASE integration boundaries.
- Out-of-scope for this plan: direct participant UI delivery and downstream BA slice implementation.
- Acceptance criteria covered: workflow taxonomy, field_key semantics, access mode and response capture contracts.

## Current state audit

- Existing app behavior: legacy form model coupled to table/column targeting and workflow side effects.
- Existing relevant code paths: forms authoring and submission flows, builder assumptions, registration coupling points.
- Existing backend contracts in use: `core_forms`, `core_form_fields`, `core_form_responses`, legacy form context/config tables.
- Known gaps to target behavior: missing final typed contract alignment and required schema evolution.

## Backend contract readiness check

- Required contracts for this slice:
  - `core_forms` workflow/access contract -> Needs change
  - `core_form_fields` `field_key` identity contract -> Needs change
  - Response subject-link contract (`workflow_subject_*`) -> Needs change
  - Removal of legacy context/config tables -> Missing
- Verification evidence links: `docs/requirements/BA02-shared-forms-platform-contracts_requirements.md`, `packages/core/docs/requirements/CR21-workflow-forms-runtime.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Document and enforce shared forms contract boundaries for BASE consuming code.
  - Files/areas: forms integration modules and type contracts.
  - Notes: no local replacement for shared primitives.
- Task 2: Refactor builder/submission surfaces to typed workflow contract assumptions.
  - Files/areas: forms authoring and submission adapters.
  - Notes: no generic multi-table client writes.
- Task 3: Add contract tests for workflow type/access mode/field key behavior.
  - Files/areas: forms contract test suites.
  - Notes: include invalid payload and permission-denied paths.

## Acceptance traceability

- Workflow typing criterion -> forms metadata contracts -> workflow taxonomy tests
- `field_key` criterion -> field and response value models -> identity stability tests
- App/workflow boundary criterion -> submission adapter boundaries -> workflow side-effect separation tests

## Test and validation plan

- Unit/integration tests to add or update: contract tests for workflow type, access mode, response linkage, permission controls.
- Manual QA pack target: `docs/delivery/test-packs/BA02-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: upstream CR21 deltas land late and block dependent slices.
  - Mitigation: keep BA02 delta list explicit in backend backlog and gate downstream slices.
- Blocker conditions (must stop unattended execution):
  - Unresolved CR21 authority mismatch.
  - Missing backend schema migration path for typed forms contract.

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
- Next action for operator/Cursor: Complete Phase 2 backend aggregation and upstream CR21-aligned contract implementation.
- Resume pointer if interrupted: Resume at BA02 backend contract confirmation and schema/RPC readiness evidence.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA02-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA02-shared-forms-platform-contracts_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
