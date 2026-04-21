# BA00 App Shell And Access

## Slice metadata

- Status: Planned
- Depends on: None
- Backend impact: Read contract only
- Frontend impact: UI
- Safe for unattended execution: Yes
- Ownership notes:
  - Backend: Enforces auth, RBAC, and route-guard contracts consumed by this shell.
  - Frontend: Owns shell routing, layout composition, and navigation derivation.

## Filename convention

Feature requirement slices use numbered prefixes per app (for BASE, `BA##`). This file follows:

**`BA00-app-shell-and-access_requirements.md`**

| Segment | Meaning |
|--------|---------|
| `BA` | BASE app requirement slice prefix. |
| `00` | Slice sequence number. |
| `app-shell-and-access` | Slice slug describing the requirement scope. |
| `requirements` | Fixed suffix for requirement slices in this folder. |

## Overview

This slice owns the authenticated BASE shell, `/login`, the default authenticated landing route `/`, and the catch-all `*` route. It establishes the route boundary, provider stack, shell navigation, and access control model for every later BASE slice.

## Current baseline behavior

- The legacy app keeps all routes in a single `src/App.tsx`.
- It uses legacy `@solvera/pace-core` imports for `PaceAppLayout`, `ProtectedRoute`, `PaceLoginPage`, `LoadingSpinner`, and `useUnifiedAuth`.
- The authenticated shell currently wraps the dashboard index route and all feature routes under one layout.
- Route ownership is duplicated in local navigation constants instead of being derived from the rebuild registry.
- The dashboard landing page doubles as an event chooser and shell entrypoint.
- The catch-all route renders a local `NotFound` page inside the authenticated shell.

## Rebuild delta

### Summary

- What changes: Establishes the authenticated shell boundary, route ownership, and shared navigation contract for BASE.
- What stays: Login remains outside the shell; route and RBAC authority stays aligned with the BASE architecture contract.

- Establish one authenticated BASE shell for admin and operator routes only.
- Keep `/login` outside the authenticated shell.
- Keep `/` as the authenticated landing route for the shell, with event selection and landing-state content defined by this slice.
- Keep `*` owned by this slice and render a BASE-scoped not-found state for unknown routes.
- Derive navigation from the implementation plan in [`./BA00-base-architecture.md`](./BA00-base-architecture.md) rather than page-local constants.
- Use `PaceAppLayout` only according to the shared shell contract defined in [`./BA00-base-architecture.md`](./BA00-base-architecture.md).

### pace-core2 delta

- Replace legacy root-barrel shell imports with scoped `pace-core2` entrypoints.
- Use provider and hook composition from `pace-core2` rather than custom bootstrap glue.
- Use branded IDs at the shell boundary instead of passing raw strings through access and context state.
- Treat `showEvents`, `showOrganisations`, and `showContextSelector` as layout props from the shared shell contract, not legacy `showEventSelector` patterns.

### pace-core2 imports

- `@solvera/pace-core/components`: `PaceAppLayout`, `ProtectedRoute`, `PaceLoginPage`, `LoadingSpinner`, `NavigationItem`
- `@solvera/pace-core/providers`: `UnifiedAuthProvider`, event and organisation providers if used by the shell bootstrap
- `@solvera/pace-core/hooks`: `useUnifiedAuth`, `useEvents`
- `@solvera/pace-core/rbac`: `PagePermissionGuard`, `AccessDenied`, `NavigationGuard`, `useCan`, `useSecureSupabase`
- `@solvera/pace-core/types`: branded shell and route-scoped IDs

### Data and schema references

- The implementation plan in [`./BA00-base-architecture.md`](./BA00-base-architecture.md) is the canonical route-ownership source of truth.
- RBAC route visibility must align with the shared page-name contract used by `PaceAppLayout` and page guards.
- Shell state depends on auth, organisation, and event context supplied by shared PACE services rather than local page state.
- No slice-local data model is introduced here.

## Acceptance criteria

- `/login` renders without the authenticated shell.
- `/` renders inside the authenticated shell and represents the shell landing experience.
- `*` renders a BASE-scoped not-found state under the shell.
- Navigation items match route ownership in the implementation plan.
- Authenticated shell routes are protected by shared RBAC and provider contracts.

## API / Contract

- Auth bootstrap contract.
- Protected route contract.
- Shared app-shell contract.
- Navigation derivation contract.
- Route registry contract.
- Not-found route contract.

## Visual specification

- Use the shared `PaceAppLayout` shell with header, navigation, main content, and footer supplied by `pace-core2`.
- Keep the login page visually separate from the authenticated shell.
- The landing route should present a clear entry state for an authenticated operator and event selection flow.
- Unknown-route handling should be plain and non-destructive, with no feature-specific affordances.

## Verification

- Login and logout route handling.
- Session restoration into the authenticated shell.
- Route protection for authenticated pages.
- Access-denied handling for restricted navigation and pages.
- Unknown-route rendering within the shell.

## Testing requirements

- Happy path: authenticated user loads `/` and can enter the shell and navigate to owned routes.
- Validation failure: unauthenticated access to protected routes is redirected or denied per the shared auth contract.
- Auth/permission failure: an authenticated user lacking a page permission sees the shared access-denied state and hidden or disabled navigation.
- Add shell composition tests, layout prop wiring tests, and catch-all route coverage.

## Acceptance traceability

- Shell route boundaries and ownership criteria -> Route registry + guarded routing in shell composition -> Route, guard, and catch-all tests in this slice.
- Navigation ownership criterion -> Navigation derivation from implementation plan -> Navigation parity and permission visibility tests.
- Access-control criterion -> Shared RBAC/provider contracts at shell boundary -> Authenticated vs unauthenticated + denied-state tests.

## Manual QA pack requirements

- Scenarios: Execute all verification flows for login boundary, shell landing, RBAC-denied paths, and unknown-route handling.
- Expected outcomes: Each verification flow matches the route ownership, guard behavior, and shell composition defined in this document.

## Build execution rules

- No schema, RPC, or RLS contract changes are permitted in this slice. If such a change is discovered, stop and add it to `docs/delivery/backend-delta-backlog.md` before continuing.
- Stop on blockers: missing shared shell contract updates, unresolved RBAC contract gaps, missing route ownership authority, or failing auth/route guard tests.

## Done criteria

- Tests pass: Shell routing, guard behavior, navigation derivation, and catch-all coverage pass in required suites.
- QA passed: Manual QA evidence for all verification scenarios is captured.
- Docs updated: This requirement and linked architecture references remain aligned with implemented shell behavior.

## Do not

- Do not split the BASE app into multiple shells.
- Do not keep page-local route ownership as the source of truth.
- Do not place public or token flows inside the authenticated shell. **Participant self-service journeys** are **pace-portal** routes, not BASE-origin routes (see [`./BA00-base-architecture.md`](./BA00-base-architecture.md) cross-cutting boundary).
- Do not preserve legacy root import sprawl just because it already works.

## References

- [`./BA00-base-project-brief.md`](./BA00-base-project-brief.md)
- [`./BA00-base-architecture.md`](./BA00-base-architecture.md)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (demo app for pace-core, or in-app for consuming apps) as specified in "Testing requirements" and "Verification". Run validate and fix any issues until it passes.

---

**Checklist before running Cursor:** intro doc + guardrails doc + Cursor rules + ESLint config + this requirements doc.
