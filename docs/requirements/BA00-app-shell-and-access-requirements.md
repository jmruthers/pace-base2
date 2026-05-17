# BA00 — App Shell and Access

---

## §1 Slice metadata

- Status: Draft
- Depends on: None
- Backend impact: Read contract only
- Frontend impact: UI

## §2 Overview

BA00 establishes the application bootstrap, login surface, and authenticated shell for the BASE app. It owns the Supabase client initialisation and RBAC setup, the provider stack composition, the top-level shell (navigation, header, user menu, footer), the redirect-only root entry route at `/`, the inactivity warning modal, session restoration, and the catch-all 404 surface.

Every authenticated route in BASE renders inside the shell this slice defines. The `/` route is a root entrypoint that performs auth-aware redirection and does not render feature content. No other slice may touch the bootstrap, the shell composition, or the routes listed in §1 metadata.

---

## §3 What this slice delivers

### Purpose

BA00 gives every BASE user a secure, consistent, and persistent operating environment. Unauthenticated users are directed to the login page. The root route `/` is redirect-only: authenticated users are sent to `/event-dashboard`, unauthenticated users are sent to `/login`. While working, users are protected against accidental session expiry by an inactivity warning modal. The navigation shell persists across all pages, providing access to all BASE module routes with RBAC-gated visibility.

### Surfaces

| Surface | Route / trigger | Type |
|---------|----------------|------|
| Login page | `/login` | Route (outside authenticated shell) |
| Root entry redirect | `/` | Route (redirect-only, no page content) |
| 404 not-found | `*` | Route (inside authenticated shell) |
| Change password modal | User menu → "Change password" | Modal (global, shell-level) |
| Inactivity warning modal | Automatic, after idle threshold | Modal (global, shell-level) |

### Boundaries

BA00 does not own `/event-dashboard` or any other named route beyond those listed above. Content rendered inside the shell `Outlet` is owned by BA01–BA18.

BA00 does not implement `ContextSelector` on the `/` route. Because `/` is redirect-only, it owns no feature UI state. Other slices that require event context and receive a user with no event selected are responsible for their own fallback/redirect logic.

The navigation items array is defined in BA00 but rendered by `PaceAppLayout`. BA00 does not place explicit `PagePermissionGuard` or `NavigationGuard` wrappers around nav items; `PaceAppLayout`'s internal `NavigationMenu` handles RBAC gating using each item's `pageId`.

### Architectural posture

- Root-first import policy applies in BA00 bootstrap/shell wiring: `@solvera/pace-core` is the default import surface for consuming app code. Scoped entrypoints (`@solvera/pace-core/components`, `/providers`, `/hooks`, `/rbac`, `/types`) are exception paths used only when the root export does not expose the symbol or a documented advanced/performance/migration case requires it.
- The Supabase client is created once in `main.tsx` using `createClient` from `@supabase/supabase-js` with env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- `setupRBAC` from `@solvera/pace-core/rbac` is called immediately after client creation, before `createRoot().render()`, with strict options `{ appName: 'BASE', getAppId }`.
- `getAppId` is resolved by BA00 bootstrap wiring via a resolver that queries `data_rbac_apps_list` for the authenticated user and returns the active app id for canonical app name `BASE`.
- Provider nesting (outermost → innermost): `QueryClientProvider` → `BrowserRouter` → `UnifiedAuthProvider` → `[AuthBridge]` → `OrganisationServiceProvider` → `EventServiceProvider` → app routes.
- `OrganisationServiceProvider` requires `user` and `session` props (in addition to `supabaseClient`). Because these values come from `useUnifiedAuth()`, a thin bridge component named `AuthBridge` is rendered inside `UnifiedAuthProvider`. `AuthBridge` consumes `useUnifiedAuth()` and passes `user` and `session` as props to `OrganisationServiceProvider`.
- This slice introduces no schema mutations or RLS changes. It consumes existing RBAC read contracts during bootstrap (for app-id resolution) and does not own write-side RPC contracts.
- `enforcePermissions` on `PaceAppLayout` must never be set to `false`.

### Page-level guards and evaluation ordering

**`/login`**
No guard. Accessible to all users. `PaceLoginPage` redirects to `/event-dashboard` on successful authentication.

**`/` (root entry route)**
Redirect-only route. No page content is rendered. Evaluation order on mount:

1. If session restoration is in progress → `SessionRestorationLoader` continues to hold route output.
2. If unauthenticated after restoration → redirect to `/login` (via `ProtectedRoute` contract).
3. If authenticated after restoration → redirect to `/event-dashboard` (`<Navigate replace to="/event-dashboard" />`).

`/` has no `PagePermissionGuard` because it is an entry redirect route with no protected page content.

**`*` (404)**
No guard. Authenticated users landing on an unmatched route see the 404 page inside the shell. Unauthenticated users landing on `*` are redirected to `/login` by `ProtectedRoute` before the 404 page renders.

---

## §4 Functional specification

### Page entry / surface entry

**FI-01.** The `/login` route renders outside the authenticated shell and is accessible without a session. Navigating to `/login` while already authenticated redirects the user to `/` (handled by `PaceLoginPage` internally).

**FI-02.** All routes except `/login` are wrapped by `ProtectedRoute`. When the user is not authenticated and session restoration has completed, `ProtectedRoute` redirects to `/login`. The redirect does not fire while session restoration is in progress.

**FI-03.** When the app first loads, `SessionRestorationLoader` renders a full-screen spinner labelled "Restoring session…" while session state is being rehydrated from storage. The spinner disappears once restoration completes (either success or timeout). No route content is visible during this period.

**FI-04.** The `/` route is a redirect-only root entry. It does not fetch or render feature content.

**FI-05.** The `*` route renders a 404 page for any path not matched by the defined route configuration.

### Loading states

**FI-06.** While `SessionRestorationLoader` is active: full-screen centred spinner with "Restoring session…" copy. All routes are held behind this loader.

**FI-07.** While session restoration is in progress, route rendering remains behind `SessionRestorationLoader`; `/` does not render intermediate feature content.

### Root entry redirect behaviour

**FI-08.** For unauthenticated users, navigating to `/` resolves to `/login` after restoration completes.

**FI-09.** For authenticated users, navigating to `/` resolves to `/event-dashboard` after restoration completes.

### Primary content — Login

**FI-10.** The login page shows a centred card with an app logo, an email input, a password input, and a "Sign in" button. The button is disabled until both fields contain non-empty values.

**FI-11.** If submitted credentials are invalid, an inline error alert appears within the login card. The user remains on `/login`.

**FI-12.** On successful login, the user is redirected to `/`.

**FI-13.** There is no forgot-password link or flow on the login page. This is a pace-core2 capability gap documented in §10.

### Primary content — Root entry

**FI-14.** The `/` route renders no shell body content of its own. It exists only to redirect.

### Primary actions — User menu

**FI-18.** The shell header contains a user menu trigger showing the user's avatar or initials. Clicking opens the user menu dropdown showing: the user's full name, the user's email, a "Change password" option, and a "Sign out" option.

**FI-19.** Clicking "Sign out": calls `await signOut()` from `useUnifiedAuth()` and then navigates to `/login`. The `await` ensures sign-out completes before navigation.

**FI-20.** Clicking "Change password": opens the change-password modal.

### Primary actions — Change password modal

**FI-21.** The change-password modal contains `PasswordChangeForm` with a "New password" field, a "Confirm password" field, a "Save" button, and a "Cancel" button.

**FI-22.** Client-side validation enforced before submission: new password must be at least 8 characters; confirm password must match new password. Validation errors shown inline; no network request if validation fails.

**FI-23.** On successful password change: the modal closes.

**FI-24.** On submission failure (server error): an inline error alert appears within `PasswordChangeForm`. The modal stays open.

**FI-25.** Clicking "Cancel" or the modal backdrop closes the modal without submitting.

### Primary actions — Inactivity

**FI-26.** After 25 minutes of user inactivity (30-minute idle threshold minus 5-minute warning window), the inactivity warning modal appears over all content showing a countdown from 300 seconds.

**FI-27.** Clicking "Stay signed in" (or the backdrop): resets the idle timer and closes the modal.

**FI-28.** Clicking "Sign out now": calls `signOut()` immediately and navigates to `/login`.

**FI-29.** If the countdown reaches zero without user action: `onIdleLogout` fires and navigates to `/login`.

**FI-30.** The inactivity timer runs only while `isAuthenticated === true`.

### Navigation

**FI-31.** The shell header contains a navigation menu trigger. Clicking it opens a navigation panel showing the 10 defined architecture routes. Items the user lacks `read` permission for are hidden; RBAC gating is handled by `PaceAppLayout` internals using each item's `pageId`.

**FI-32.** The navigation items are (in order): Event Dashboard, Configuration, Forms, Registration Types, Applications, Communications, Units, Activities, Scanning, Reports.

**FI-33.** The active navigation item (matching the current URL path) is visually distinguished.

### 404 surface

**FI-34.** The `*` route renders a card with the heading "404 — Page Not Found" and a "Return to Event Dashboard" button that navigates to `/event-dashboard` via React Router `<Link>` (client-side, no page reload).

### Edge cases and constraints

**FI-35.** `ContextSelector` is not rendered on `/` because `/` is redirect-only and renders no feature surface.

**FI-36.** `PasswordChangeForm`'s `onSubmit` callback receives `{ newPassword, confirmPassword }`. The consumer invokes the Supabase password update (`supabase.auth.updateUser({ password: newPassword })`) and returns `Promise<{ error?: unknown }>`. `PasswordChangeForm` displays the error if the returned object contains a non-null `error` field.

**FI-37.** `PaceAppLayout`'s user menu only renders when all four of `userFullName`, `userEmail`, `onUserMenuSignOut`, and `onUserMenuChangePassword` are non-null. BA00 always supplies all four. `userFullName` is derived as `user?.user_metadata?.full_name ?? user?.email ?? 'User'`. `userEmail` is derived as `user?.email ?? ''`.

**FI-38.** The `OrganisationServiceProvider` requires `user` and `session` props sourced from `useUnifiedAuth()`. These are passed by the `AuthBridge` component rendered inside `UnifiedAuthProvider` in `main.tsx` (see BR-07).

---

## §5 Visual specification

- Layout authority is limited to `/login`, `/`, and `*`; behavioural rules stay in §4.
- Keep visuals to login card, in-shell 404, inactivity modal, and password modal. `/` has no dedicated visual surface.
- Nav visibility and role badges are outputs of RBAC/event-role contracts (not redefined here).

## §6 Business rules

### BR-01 — Authentication gate

- Input: `isAuthenticated: boolean`, `isRestoring: boolean` (from `UnifiedAuthProvider` via `ProtectedRoute` and `SessionRestorationLoader`)
- Rule:
  - `isRestoring === true` → `SessionRestorationLoader` shows full-screen spinner; `ProtectedRoute` holds (does not redirect during restoration)
  - `isAuthenticated === false` AND `isRestoring === false` → `ProtectedRoute` renders `<Navigate to="/login" replace />`
  - `isAuthenticated === true` AND `isRestoring === false` → `ProtectedRoute` renders `<Outlet />`
- Edge case: if session restoration times out (`hasTimedOut === true`), `SessionRestorationLoader` renders children regardless of `isRestoring` value

### BR-02 — Root entry route evaluation (`/`)

- Inputs: `isAuthenticated: boolean`, session-restoration state from `SessionRestorationLoader`/`ProtectedRoute`.
- Evaluation order — strictly sequential, first matching step wins:

| Step | Condition | Output |
|------|-----------|--------|
| 1 | Session restoration not complete | Hold route behind `SessionRestorationLoader` |
| 2 | Restoration complete AND `isAuthenticated === false` | Redirect to `/login` |
| 3 | Restoration complete AND `isAuthenticated === true` | Redirect to `/event-dashboard` |

- `/` is redirect-only and does not evaluate event/organisation loading branches.
- No `PagePermissionGuard` is required on `/` because it has no protected page content.

### BR-03 — Inactivity timeout

| Parameter | Value |
|-----------|-------|
| `idleTimeoutMs` | 1,800,000 ms (30 minutes) |
| `warnBeforeMs` | 300,000 ms (5 minutes) |
| Warning onset | After 25 minutes of inactivity |
| Countdown starts at | 300 seconds |
| `onIdleLogout` target | navigate('/login') |

- "Stay signed in" action (or backdrop click): pass the `onStaySignedIn` callback received from `UnifiedAuthProvider`'s `renderInactivityWarning` prop directly to `InactivityWarningModal`'s `onStaySignedIn` prop. This callback resets the idle timer and closes the modal — it is not the same as calling `handleStaySignedIn` from `useUnifiedAuth()` directly.
- "Sign out now" action: pass the `onSignOutNow` callback received from `renderInactivityWarning` directly to `InactivityWarningModal`'s `onSignOutNow` prop. This callback calls `signOut()` and navigates to `/login` — it is not the same as calling `handleSignOutNow` from `useUnifiedAuth()` directly.
- Countdown reaches zero: triggers the same action as the "Sign out now" button — calls `signOut()` and navigates to `/login`
- Timer runs only while `isAuthenticated === true`
- `inactivityEnabled` is `true` in `UnifiedAuthProvider` only when ALL FOUR of `idleTimeoutMs`, `warnBeforeMs`, `onIdleLogout`, AND `renderInactivityWarning` are provided. Omitting any one disables the feature silently with no warning.

### BR-04 — Navigation permission gating

- Each `NavigationItem` in the nav array carries a `pageId` matching a `page_name` value in `rbac_app_pages`
- `PaceAppLayout`'s internal `NavigationMenu` evaluates `read` permission for each item's `pageId` against the authenticated user's RBAC state
- Items without a matching permitted page are hidden (not rendered, not disabled)
- All 10 architecture route items are always present in the `navItems` prop; RBAC dynamically hides inaccessible or unimplemented items

### BR-05 — Session restoration

- Input: `isRestoring: boolean`, `hasTimedOut: boolean` from `useSessionRestoration()` (consumed internally by `SessionRestorationLoader`)
- `isRestoring === true` AND `hasTimedOut === false` → spinner shown; children not rendered
- `isRestoring === true` AND `hasTimedOut === true` → children rendered (graceful degradation)
- `isRestoring === false` → children rendered immediately

### BR-06 — Root redirect target contract

- Input: user lands on `/` after restoration.
- Sequence:
  1. Unauthenticated user → `/login`
  2. Authenticated user → `/event-dashboard`
- No intermediate landing UI is rendered by BA00 at `/`.

### BR-07 — Provider wiring bridge (`AuthBridge`)

`OrganisationServiceProvider` requires `user: { id: string } | null` and `session: unknown` props alongside `supabaseClient`. These come from `useUnifiedAuth()` which is only available inside `UnifiedAuthProvider`. The wiring pattern:

```
// In main.tsx (pseudocode structure)
function AuthBridge({ supabase }) {
  const { user, session } = useUnifiedAuth();
  return (
    <OrganisationServiceProvider supabaseClient={supabase} user={user} session={session}>
      <EventServiceProvider supabaseClient={supabase}>
        <App />
      </EventServiceProvider>
    </OrganisationServiceProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <UnifiedAuthProvider supabaseClient={supabase} appName="BASE" ...inactivityProps>
        <AuthBridge supabase={supabase} />
      </UnifiedAuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
```

`AuthBridge` is a local implementation detail of `main.tsx`. It is not exported.

### BR-08 — Navigation items (static definition)

The nav items array is static and defined at module scope (not derived at runtime):

```
const NAV_ITEMS: NavigationItem[] = [
  { id: 'event-dashboard',    label: 'Event Dashboard',    href: '/event-dashboard',    pageId: 'event-dashboard' },
  { id: 'configuration',      label: 'Configuration',      href: '/configuration',      pageId: 'configuration' },
  { id: 'forms',              label: 'Forms',              href: '/forms',              pageId: 'forms' },
  { id: 'registration-types', label: 'Registration Types', href: '/registration-types', pageId: 'registration-types' },
  { id: 'applications',       label: 'Applications',       href: '/applications',       pageId: 'applications' },
  { id: 'communications',     label: 'Communications',     href: '/communications',     pageId: 'communications' },
  { id: 'units',              label: 'Units',              href: '/units',              pageId: 'units' },
  { id: 'activities',         label: 'Activities',         href: '/activities',         pageId: 'activities' },
  { id: 'scanning',           label: 'Scanning',           href: '/scanning',           pageId: 'scanning' },
  { id: 'reports',            label: 'Reports',            href: '/reports',            pageId: 'reports' },
];
```

`pageId` values must match `rbac_app_pages.page_name` exactly in the database. Verify via Supabase MCP before shipping.

### BR-09 — User display props derivation

`PaceAppLayout` requires `userFullName: string` and `userEmail: string` as non-null strings. Derive from `useUnifiedAuth()`:

```
userFullName = user?.user_metadata?.full_name ?? user?.email ?? 'User'
userEmail    = user?.email ?? ''
```

These must be non-null strings passed to `PaceAppLayout` at all times while the shell is rendered.

### BR-10 — Root route no-content rule

- `/` must not render domain content, data lists, or selection UI.
- Any prior landing-grid behavior is out of scope for BA00 and must not be reintroduced.

---

## §7 API / Contract

**This slice owns no exported types, services, or hooks.** BA00 is a shell and bootstrap slice; it does not publish contracts to other slices.

**Read contracts consumed:**

| Contract | Source | Fields consumed |
|----------|--------|----------------|
| Auth state | `useUnifiedAuth()` | `user`, `session`, `isAuthenticated`, `signOut`, `isLoading` |
| User display info | `useUnifiedAuth()` | `user.user_metadata.full_name`, `user.email` |
| Inactivity state | `useUnifiedAuth()` | `showInactivityWarning`, `inactivityTimeRemaining`, `handleStaySignedIn`, `handleSignOutNow` |
| RBAC page permissions | `PaceAppLayout` internals | consumed implicitly via `navItems[].pageId` |

**Cross-slice handoffs:**

- BA00 redirects authenticated users from `/` to `/event-dashboard` (owned by BA01 route ownership contract). BA00 does not import or render any BA01 component.
- All other slices render within BA00's `PaceAppLayout` `Outlet`. BA00 provides the shell; they provide the content.

**No write contracts and no RLS changes are owned by this slice.**
BA00 may consume existing RBAC read RPC contracts as part of bootstrap app-id resolution.

---

## §8 Data and schema references

| Resource | Relationship | Notes |
|----------|-------------|-------|
| `rbac_app_pages` | Consumed (not owned) | `page_name` column must contain values matching each `navItems[].pageId`. Values expected: `event-dashboard`, `configuration`, `forms`, `registration-types`, `applications`, `communications`, `units`, `activities`, `scanning`, `reports`. Verify via Supabase MCP. |
| Supabase auth | Consumed via `UnifiedAuthProvider` | No direct queries. Sessions, tokens, and refresh handled by pace-core2. |
| Event data | Consumed via `EventServiceProvider` / `useEvents()` | No direct queries. |

**Build agent verification step:** before shipping nav items, run `SELECT page_name FROM rbac_app_pages WHERE app_id = 'BASE'` (or equivalent) via Supabase MCP and confirm all 10 `pageId` values are present.

**Fail-closed page access:** pace-core `rbac_check_permission_simplified` denies page-scoped permissions when the page is missing from `rbac_app_pages`, or when no `rbac_page_permissions` grant exists for the user’s role — including Event Admin. Operators must enable CRUD in the permissions matrix per page; implicit Event Admin access to uncatalogued routes is not supported (pace-core migration `20260516140000_rbac_fail_closed_uncatalogued_pages.sql` and catalogue seed `20260516140100_base_shell_pages_catalogue_seed.sql`).

---

## §9 pace-core2 imports

### 9.1 Required symbols actually used in this slice

| Symbol | Import policy | Why used in BA00 |
|---|---|---|
| `PaceAppLayout` | Default: `@solvera/pace-core`; allow scoped exception if needed by export location | Authenticated shell layout |
| `PaceLoginPage` | Default: `@solvera/pace-core`; allow scoped exception if needed by export location | Login route |
| `ProtectedRoute` | Default: `@solvera/pace-core`; allow scoped exception if needed by export location | Session gate for protected routes |
| `setupRBAC` | Scoped exception allowed (`@solvera/pace-core/rbac`) when not available from root | RBAC bootstrap before render |
| `useUnifiedAuth` | Default: `@solvera/pace-core`; allow scoped exception if needed by export location | User/session source for bridge + shell actions |

### 9.2 Slice-specific caveats only

- `setupRBAC(supabaseClient, { appName: 'BASE', getAppId })` runs immediately after client creation and before render.
- `OrganisationServiceProvider` receives `user/session` from `useUnifiedAuth()` through `AuthBridge`.
- Keep `PaceAppLayout` permission enforcement enabled.
- `/` is a redirect-only root entrypoint; it does not render feature content and is not page-guarded.
- Import style in this slice follows root-first policy; scoped imports are exception-only.

## §10 Permission and access rules

| Route / Surface | Access rule |
|----------------|-------------|
| `/login` | Open to all. No auth required. |
| `/` (root entry) | Redirect-only entry route. Unauthenticated users resolve to `/login`; authenticated users resolve to `/event-dashboard`. No `PagePermissionGuard` because no page content is rendered. |
| `*` (404) | Authenticated users only (via `ProtectedRoute`). No `PagePermissionGuard`. |
| Navigation items | Each item's visibility gated by `read` permission on `rbac_app_pages.page_name` matching `pageId`. Enforced by `PaceAppLayout` internals. |
| Change password modal | All authenticated users. No additional permission check. |
| Inactivity modal | All authenticated users. Fires automatically. |
| User menu (sign out, change password) | All authenticated users. Always rendered (user props always non-null in BA00). |

**Forgot password:** not implemented. pace-core2 capability gap. No fallback or workaround.

---

## §11 Acceptance criteria

Given an unauthenticated user, when they navigate to `/`, then they are redirected to `/login`.

Given an unauthenticated user, when they navigate to `/some-other-route`, then they are redirected to `/login`.

Given an unauthenticated user, when they enter invalid credentials on `/login` and click "Sign in", then an inline error alert appears and they remain on `/login`.

Given an unauthenticated user, when they enter valid credentials and click "Sign in", then they are redirected to `/event-dashboard`.

Given an authenticated user, when they navigate to `/`, then they are redirected to `/event-dashboard`.

Given an authenticated user, when they navigate to an unrecognised URL (e.g. `/does-not-exist`), then the 404 page is shown inside the shell.

Given an authenticated user on the 404 page, when they click "Return to Event Dashboard", then they are navigated to `/event-dashboard` via client-side routing (no full page reload).

Given an authenticated user, when they click "Sign out" in the user menu, then they are signed out and redirected to `/login`.

Given an authenticated user, when they open the change-password modal and submit passwords that don't match, then a validation error is shown and no network request is made.

Given an authenticated user, when they open the change-password modal and submit a new password shorter than 8 characters, then a validation error is shown and no network request is made.

Given an authenticated user, when they open the change-password modal and submit a valid matching password pair, then the modal closes on success.

Given an authenticated user who has been idle for 25 minutes, when the inactivity modal appears and they click "Stay signed in", then the modal closes and the idle timer resets.

Given an authenticated user who has been idle for 25 minutes, when the inactivity modal appears and they click "Sign out now", then they are signed out and redirected to `/login`.

Given the app loading with a stored session, when session restoration is in progress, then a full-screen spinner with "Restoring session…" is shown and no other content is visible.

Given an authenticated user whose nav item lacks a matching `read` permission in RBAC, when they view the navigation, then that nav item is not visible.

---

## §12 Verification

- Verify `/login` unauthenticated entry and authenticated redirect behaviour.
- Verify `/` decision tree: restoration hold, unauthenticated redirect to `/login`, authenticated redirect to `/event-dashboard`.
- Verify in-shell 404 route and return navigation.
- Verify inactivity warning and password-change flows.

## §13 Testing requirements

- Route-guard tests for authenticated vs unauthenticated access.
- Root-entry redirect tests for authenticated and unauthenticated branches.
- Shell permission-visibility tests for nav items.
- Session-restoration and inactivity callback tests.

## §14 Build execution rules

- Scope is `/login`, `/`, and `*` plus bootstrap/provider wiring they require.
- No schema/RLS/Edge-function changes.
- Bootstrap may consume existing RBAC read RPCs used by `getAppId`; do not introduce new backend write contracts in this slice.
- Stop on missing exports or RBAC page registrations.
- Preserve bootstrap order: client -> `setupRBAC` -> providers -> render.

## §15 Done criteria

- Route behaviours in §4 are demonstrable for login, root-entry redirect, and 404 flows.
- Verification steps in §12 are completed with evidence.
- Automated tests in §13 cover critical guard and state branches.

## §16 Do not

- Do not disable `PaceAppLayout` permission enforcement.
- Do not add `PagePermissionGuard`/`ContextSelector` or feature content to `/`; it remains redirect-only.
- Do not bypass `AuthBridge` for `OrganisationServiceProvider` `user/session`.
- Do not use unsupported/retired APIs documented as unavailable in this slice.

## §17 References

- `docs/requirements/base/BASE-project-brief.md`
- `docs/requirements/base/BASE-architecture.md`
- `docs/requirements/base/BA01-event-workspace-and-configuration-requirements.md`
- `packages/core/docs/requirements/CR03-auth-and-context.md`
- `packages/core/docs/requirements/CR05c-layout-and-shell.md`

## §18 Implementing Agent Instructions

- Implement only BA00-owned shell/bootstrap surfaces.
- Stop and report contract/export blockers; do not invent local substitutes.
