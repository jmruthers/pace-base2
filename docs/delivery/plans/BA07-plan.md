# Delivery Plan: BA07 Token Approval Actions

## Plan metadata

- Slice ID: BA07
- Requirement source: `docs/requirements/BA07-token-approval-actions_requirements.md`
- Status: Planned
- Owner: BASE delivery team
- Last updated: 2026-04-21
- Depends on slices: BA04, BA05a
- Blocks slices: None
- Backend readiness required: Yes
- Safe for unattended execution: No

## Requirement alignment

- Requirement summary:
  - Define token-based approval action contracts and lifecycle behavior.
  - Keep token approval UI route ownership in pace-portal (`/approvals/:token`).
  - Preserve secure single-use token issuance, resolution, and reissue behavior.
- In-scope implementation for this plan: BASE approval-action contracts, token lifecycle endpoints, organiser controls.
- Out-of-scope for this plan: BASE-hosted token approval UI route.
- Acceptance criteria covered: token lifecycle correctness, contract security, workflow integration.

## Current state audit

- Existing app behavior: token action capabilities are incomplete and legacy-coupled.
- Existing relevant code paths: approval check and action adapters.
- Existing backend contracts in use: check rows with token hash/expiry semantics.
- Known gaps to target behavior: secure reissue/invalidations and portal/BASE ownership clarity.

## Backend contract readiness check

- Required contracts for this slice:
  - Token submit/resolve contracts -> Needs change
  - Token hash/expiry/reissue invalidation contract -> Needs change
  - Approval check state mutation contract -> Missing
- Verification evidence links: `docs/requirements/BA07-token-approval-actions_requirements.md`, `docs/requirements/BA00-base-architecture.md`
- If missing/changed:
  - Add to `docs/delivery/backend-delta-backlog.md`
  - Mark this slice as not build-queue-ready until backend ready gate passes

## Frontend implementation plan

- Task 1: Implement BASE-side token approval contract clients and admin tooling actions.
  - Files/areas: approval action services and organiser controls.
  - Notes: no direct token handling in participant BASE routes.
- Task 2: Enforce portal ownership boundary for token UI.
  - Files/areas: route ownership docs and integration boundaries.
  - Notes: canonical UI route remains `/approvals/:token` in portal.
- Task 3: Add token lifecycle and replay-protection tests.
  - Files/areas: approval action tests.
  - Notes: cover invalid/expired/reissued token flows.

## Acceptance traceability

- Token lifecycle criterion -> token action services -> lifecycle tests
- Security criterion -> reissue/invalidation + single-use controls -> replay/expiry tests
- Portal boundary criterion -> no BASE token route UI ownership -> boundary assertions

## Test and validation plan

- Unit/integration tests to add or update: token lifecycle tests, approval mutation tests, permission tests.
- Manual QA pack target: `docs/delivery/test-packs/BA07-qa-pack.md`
- Required quality gates:
  - lint
  - type-check
  - tests
  - validate

## Risks and blockers

- Risk: security regressions around token replay.
  - Mitigation: explicit lifecycle tests and backend-only mutation controls.
- Blocker conditions (must stop unattended execution):
  - Missing secure token lifecycle contract.
  - Conflicting ownership of token approval UI route.

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
- Next action for operator/Cursor: finalize BA07 token lifecycle backend contracts and portal integration boundary.
- Resume pointer if interrupted: restart from token contract verification and security test matrix.

## Done evidence requirements

- Build report target: `docs/delivery/reports/BA07-build-report.md`
- Evidence required before status `Built`:
  - [ ] Acceptance criteria met
  - [ ] Quality gates passed
  - [ ] Build report written
  - [ ] Queue status updated

## References

- Requirement slice: `docs/requirements/BA07-token-approval-actions_requirements.md`
- Related architecture section: `docs/requirements/BA00-base-architecture.md`
- Related project brief section: `docs/requirements/BA00-base-project-brief.md`
- Backend ready report (if applicable): `docs/delivery/reports/backend-ready-report.md` (to be produced in Phase 4)
