# Delivery Plan: BA15 Reporting

## Plan metadata

- Slice ID: BA15
- Requirement source: `docs/requirements/BA15-reporting_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: BA06, BA08, BA11, BA14
- Blocks slices: None
- Backend readiness required: Yes
- Safe for unattended execution: No

## Requirement alignment

- Requirement summary:
  - Deliver BASE reporting route at `/reports` over shared reporting foundations.
  - Require CR22 shared reporting foundations before BA15 implementation.
  - Support event-scoped reporting domains: participant, unit, activity, scan.
- In-scope implementation for this plan: report builder and template flows consuming shared reporting engine contracts.
- Out-of-scope for this plan: BASE-local reporting engine fork or participant-only reporting regression.
- Acceptance criteria covered: shared-engine consumption, domain scope completeness, template persistence behavior.

## Current state audit

- Existing app behavior: legacy reporting exists but is coupled to old RPC and local assumptions.
- Existing relevant code paths: `/reports` page, query builder, template save/load flows.
- Existing backend contracts in use: report template storage and field catalog data.
- Known gaps to target behavior: CR22 dependency, explore/domain model alignment, metadata-driven field availability.

## Backend contract readiness check

- Required contracts for this slice:
  - CR22 shared reporting foundations -> Missing
  - BASE domain explores and event scope contracts -> Needs change
  - Template persistence contract (`core_report_template`) -> Needs change
- Verification evidence links: `docs/requirements/BA15-reporting_requirements.md`, `packages/core/docs/requirements/CR22-shared-reporting-foundations.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Rebuild `/reports` to consume shared reporting primitives.
  - Files/areas: reports route and query builder integration.
  - Notes: no BASE-local reporting engine divergence.
- Task 2: Implement domain/explore selection and event-scoped query behavior.
  - Files/areas: query model and explore selection adapters.
  - Notes: include participant/unit/activity/scan domains.
- Task 3: Add template CRUD and explore validation tests.
  - Files/areas: reporting integration tests.
  - Notes: include permission and template ownership cases.

## Acceptance traceability

- Shared-engine criterion -> reports integration adapters -> engine consumption tests
- Domain scope criterion -> explore selector + query model -> domain coverage tests
- Template criterion -> template persistence path -> CRUD and ownership tests

## Test and validation plan

- Unit/integration tests to add or update: query builder tests, template tests, permission tests, explore validation tests.
- Manual QA pack target: `docs/delivery/test-packs/BA15-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: premature BA15 implementation before CR22 causes rework and contract drift.
  - Mitigation: explicit deferred queue state until CR22 + backend gate completion.
- Blocker conditions (must stop unattended execution):
  - CR22 foundations not landed.
  - Missing event-scoped explore contracts for BASE domains.

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
- Queue status recommendation: Deferred
- Next action for operator/Cursor: complete CR22 and backend reporting readiness, then reclassify BA15 to Blocked/Ready.
- Resume pointer if interrupted: resume BA15 after CR22 readiness evidence is linked and dependencies pass.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA15-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA15-reporting_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
