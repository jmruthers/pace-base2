# S00 App Shell And Access

## Overview

This slice owns the authenticated BASE shell, `/login`, the default authenticated landing route `/`, and the catch-all `*` route. It establishes the route boundary, provider stack, shell navigation, and access control model for every later BASE slice.

## Current legacy baseline

- The legacy app keeps all routes in a single `src/App.tsx`.
- It uses legacy `@solvera/pace-core` imports for `PaceAppLayout`, `ProtectedRoute`, `PaceLoginPage`, `LoadingSpinner`, and `useUnifiedAuth`.
- The authenticated shell currently wraps the dashboard index route and all feature routes under one layout.
- Route ownership is duplicated in local navigation constants instead of being derived from the rebuild registry.
- The dashboard landing page doubles as an event chooser and shell entrypoint.
- The catch-all route renders a local `NotFound` page inside the authenticated shell.

## Rebuild target

- Establish one authenticated BASE shell for admin and operator routes only.
- Keep `/login` outside the authenticated shell.
- Keep `/` as the authenticated landing route for the shell, with event selection and landing-state content defined by this slice.
- Keep `*` owned by this slice and render a BASE-scoped not-found state for unknown routes.
- Derive navigation from the implementation plan in [`../architecture.md`](../architecture.md) rather than page-local constants.
- Use `PaceAppLayout` only according to the shared shell contract defined in [`../architecture.md`](../architecture.md).

## pace-core2 delta

- Replace legacy root-barrel shell imports with scoped `pace-core2` entrypoints.
- Use provider and hook composition from `pace-core2` rather than custom bootstrap glue.
- Use branded IDs at the shell boundary instead of passing raw strings through access and context state.
- Treat `showEvents`, `showOrganisations`, and `showContextSelector` as layout props from the shared shell contract, not legacy `showEventSelector` patterns.

## pace-core2 imports

- `@solvera/pace-core/components`: `PaceAppLayout`, `ProtectedRoute`, `PaceLoginPage`, `LoadingSpinner`, `NavigationItem`
- `@solvera/pace-core/providers`: `UnifiedAuthProvider`, event and organisation providers if used by the shell bootstrap
- `@solvera/pace-core/hooks`: `useUnifiedAuth`, `useEvents`
- `@solvera/pace-core/rbac`: `PagePermissionGuard`, `AccessDenied`, `NavigationGuard`, `useCan`, `useSecureSupabase`
- `@solvera/pace-core/types`: branded shell and route-scoped IDs

## Data and schema references

- The implementation plan in [`../architecture.md`](../architecture.md) is the canonical route-ownership source of truth.
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

## Open questions

None currently.

## Do not

- Do not split the BASE app into multiple shells.
- Do not keep page-local route ownership as the source of truth.
- Do not place public or token flows inside the authenticated shell. **Participant self-service journeys** are **pace-portal** routes, not BASE-origin routes (see [`../architecture.md`](../architecture.md) cross-cutting boundary).
- Do not preserve legacy root import sprawl just because it already works.

## References

- [`../project-brief.md`](../project-brief.md)
- [`../architecture.md`](../architecture.md)
