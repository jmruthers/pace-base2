# BA00 Build Report

- Slice: `BA00`
- Requirement: `docs/requirements/BA00-app-shell-and-access_requirements.md`
- Plan: `docs/delivery/plans/BA00-plan.md`
- Attempt timestamp (UTC): `2026-04-21T11:47:15Z`
- Owner: Codex
- Result: Built

## Preflight

- Dependency status: Pass (`BA00` has no dependencies).
- Plan exists: Pass (`docs/delivery/plans/BA00-plan.md`).
- QA pack exists: Pass (`docs/delivery/test-packs/BA00-qa-pack.md`).
- Backend-ready evidence linkable: Pass (`docs/delivery/reports/base-backend-ready-report.md` confirms freeze for `BD-001..BD-015`).

## In-scope implementation completed

- Updated route ownership IDs to match BA slice contract naming:
  - `src/config/baseRouteRegistry.ts`
- Added BA00 acceptance-focused route/navigation tests:
  - `src/App.test.tsx`
- Removed obsolete placeholder test file:
  - `src/app.test.ts`

## Acceptance criteria validation

- `/login` outside shell: Covered by `BA00 shell routing boundary` test.
- `/` inside authenticated shell: Covered by `BA00 shell routing boundary` test.
- `*` unknown route uses BASE not-found in shell: Covered by `BA00 shell routing boundary` test.
- Navigation derives from route ownership registry: Covered by `BA00 navigation and route ownership derivation` tests.
- Guard boundary behavior (unauthenticated, dedicated runtime path): Covered by `BA00 shell routing boundary` tests.

## Quality gates

- `npm run lint` -> Pass
- `npm run type-check` -> Pass
- `npm run test` -> Pass (8/8)
- `npm run validate` -> Pass (all 6 checks, including pace-core audit)

## Failures

- Initial `npm run test` run failed due test isolation leakage (missing cleanup between cases); fixed in-slice by adding `afterEach(cleanup)` in `src/App.test.tsx`.
- Final gate state after fix: all required gates passing.

## Blocker taxonomy

- None (slice built).

## Evidence

- Gate output references:
  - `audit/202604212146-01-authority-wiring-report.md`
  - `audit/202604212146-02-type-check-report.md`
  - `audit/202604212146-03-eslint-report.md`
  - `audit/202604212146-04-build-report.md`
  - `audit/202604212146-05-tests-report.md`
  - `audit/202604212146-pace-core-audit.md`

## Next action

- Update `docs/delivery/build-queue.md` row for `BA00` to `Built`.
- Select next dependency-safe queue item (`BA01` first by deterministic order).
