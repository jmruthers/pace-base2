# BA12 Build Report

- Slice: `BA12`
- Requirement: `docs/requirements/BA12-scanning-setup_requirements.md`
- Plan: `docs/delivery/plans/BA12-plan.md`
- Attempt timestamp (UTC): `2026-04-21T12:40:13Z`
- Owner: Codex
- Result: Built

## Preflight

- Dependencies required: `BA01`, `BA09`
- Dependency check: Pass (`BA01` and `BA09` are Built)
- Plan/QA artifacts: Pass
- Backend-ready evidence linked and slice-ready: Pass (Phase 4 backend freeze with `BD-001` through `BD-015` resolved)

## In-scope implementation completed

- Added `/scanning` setup and ops hub surface:
  - `src/pages/scanning/ScanningSetupPage.tsx`
- Added BA12 tests for:
  - scan-point create/deactivate flows
  - manifest generation entrypoint
  - File: `src/pages/scanning/ScanningSetupPage.test.tsx`
- Updated route wiring in `src/App.tsx` for BA12-owned route.

## Acceptance criteria validation

- `/scanning` provides setup-level scan-point operations.
- Manifest generation entrypoint is explicit per scan point.
- Deactivation updates scan-point state without runtime/sync behavior coupling.
- Route remains permission-gated and setup-focused.

## Quality gates

- `npm run lint` -> Pass
- `npm run type-check` -> Pass
- `npm run test` -> Pass
- `npm run validate` -> Pass (all checks including pace-core audit)

## Next action

- Continue deterministic queue execution from `BA13`.
