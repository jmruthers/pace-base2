# BA00 — App Shell and Access

---

## §1 Slice metadata

- Status: Draft
- Depends on: None
- Backend impact: Read contract only
- Frontend impact: UI

## §2 Overview

BA00 establishes the application bootstrap, login surface, and authenticated shell for the BASE app. It owns the Supabase client initialisation and RBAC setup, the provider stack composition, the top-level shell (navigation, header, user menu, footer), the shell landing route at `/` (event picker), the inactivity warning modal, session restoration, and the catch-all 404 surface.

Every authenticated route in BASE renders inside the shell this slice defines. The `/` route is the organiser event-picker landing — the global entry for choosing which event to operate. No other slice may touch the bootstrap, the shell composition, or the routes listed in §1 metadata.

- Prototype reference: routing, auth gate, and authenticated shell in `pace-prototype/apps/pace-base/app.jsx`; shell landing in `pace-prototype/apps/pace-base/pages/LandingPage.jsx` (`ShellLandingPage`).

---

## §3 What this slice delivers

### Purpose

BA00 gives every BASE user a secure, consistent, and persistent operating environment. Unauthenticated users are directed to the login page. Authenticated users land on `/` — a shell-level event picker listing events they operate for the selected organisation. While working, users are protected against accidental session expiry by an inactivity warning modal. The navigation shell persists across all pages; primary nav is context-aware (landing vs in-event) with RBAC-gated visibility where applicable.

### Surfaces

| Surface | Route / trigger | Type |
|---------|----------------|------|
| Login page | `/login` | Route (outside authenticated shell) |
| Shell landing (event picker) | `/` | Route (inside authenticated shell) |
| 404 not-found | `*` | Route (inside authenticated shell) |
| Change password modal | User menu → "Change password" | Modal (global, shell-level) |
| Inactivity warning modal | Automatic, after idle threshold | Modal (global, shell-level) |

### Boundaries

BA00 does not own `/event-dashboard` or any other named route beyond those listed above. Content rendered inside the shell `Outlet` is owned by BA01–BA18.

BA00 owns the shell landing at `/` and the global event picker UX. Event dashboard content at `/event-dashboard` (or prototype `/events/:code`) is owned by BA01; BA00 navigates into an event via tile click or context selector.

The navigation items array is derived at runtime by route context (see BR-08), capped at **five** primary items per CR05c, and rendered by `PaceAppLayout`'s `NavigationMenu` (inline pills at `lg+`, compact Select below `lg`). BA00 does not place explicit `PagePermissionGuard` or `NavigationGuard` wrappers around nav items; `NavigationMenu` handles RBAC gating using each item's `pageId` or `permissions` where items are permission-scoped.

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
No guard. Accessible to all users. `PaceLoginPage` redirects to `/` on successful authentication (prototype parity).

**`/` (shell landing route)**
Authenticated shell landing. Evaluation order on mount:

1. If session restoration is in progress → `SessionRestorationLoader` continues to hold route output.
2. If unauthenticated after restoration → redirect to `/login` (via `ProtectedRoute` contract).
3. If authenticated after restoration → render shell landing (event picker) inside `PaceAppLayout`.

`/` has no `PagePermissionGuard` because it is a shell-level surface, not a permission-scoped feature page.

**`*` (404)**
No guard. Authenticated users landing on an unmatched route see the 404 page inside the shell. Unauthenticated users landing on `*` are redirected to `/login` by `ProtectedRoute` before the 404 page renders.

---

## §4 Functional specification

### Page entry / surface entry

**FI-01.** The `/login` route renders outside the authenticated shell and is accessible without a session. Navigating to `/login` while already authenticated redirects the user to `/` (handled by `PaceLoginPage` internally).

**FI-02.** All routes except `/login` are wrapped by `ProtectedRoute`. When the user is not authenticated and session restoration has completed, `ProtectedRoute` redirects to `/login`. The redirect does not fire while session restoration is in progress.

**FI-03.** When the app first loads, `SessionRestorationLoader` renders a full-screen spinner labelled "Restoring session…" while session state is being rehydrated from storage. The spinner disappears once restoration completes (either success or timeout). No route content is visible during this period.

**FI-04.** The `/` route renders the shell landing (event picker) inside the authenticated shell. It lists events the operator can access for the selected organisation.

**FI-05.** The `*` route renders a 404 page for any path not matched by the defined route configuration.

### Loading states

**FI-06.** While `SessionRestorationLoader` is active: full-screen centred spinner with "Restoring session…" copy. All routes are held behind this loader.

**FI-07.** While session restoration is in progress, route rendering remains behind `SessionRestorationLoader`; `/` does not render intermediate feature content.

### Root entry behaviour (`/`)

**FI-08.** For unauthenticated users, navigating to `/` resolves to `/login` after restoration completes.

**FI-09.** For authenticated users, navigating to `/` renders the shell landing with the event tile grid and attention queue (see §5).

### Primary content — Login

**FI-10.** The login page shows a centred card with an app logo, an email input, a password input, and a "Sign in" button. The button is disabled until both fields contain non-empty values.

**FI-11.** If submitted credentials are invalid, an inline error alert appears within the login card. The user remains on `/login`.

**FI-12.** On successful login, the user is redirected to `/`.

**FI-13.** There is no forgot-password link or flow on the login page. This is a pace-core2 capability gap documented in §10.

### Primary content — Shell landing (`/`)

**FI-14.** The `/` route renders inside the authenticated shell:

1. **PageHeader** — breadcrumb trail (`pace-base` → `Events`); title "Choose an event"; subtitle with organisation event count; header actions: secondary "Find by code", primary "New event" (navigates to event creation — BA01).
2. **Event tile grid** — responsive grid of `EventCard` cards via `BaseShellEventCard` (default first 4 upcoming-then-past ordered events; "Show all" toggle when more than 4). Each card resolves its header logo via `useEventLogoReference` (`core_events.logo_id` → public `core_file_references`) with `event_logo` stub fallback from `data_user_events_get`; initials appear only when both paths are absent (CR29 / BA01 pointer model). Card body shows date badge, name, venue, and date meta; footer shows foot counts (applications, forms, expected participants). Tile click navigates into that event's overview (prototype: `/events/:code`; production: sets event context and navigates to `/event-dashboard`).
3. **AttentionQueue** — cross-event items for events with applications awaiting approval; each item links to that event's applications queue.

**FI-15.** When the operator has zero events, the landing shows an `EmptyState` with guidance and a primary action to create an event (BA01).

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

**FI-31.** The shell header contains primary navigation. Nav items are **context-aware** (see BR-08): on shell landing (`/`) a single "Events" item; when operating inside an event, Overview, Applications, Communications, and Reports. Items the user lacks `read` permission for are hidden; RBAC gating is handled by `PaceAppLayout` internals using each item's `pageId`.

**FI-32.** On shell landing, the sole nav item is **Events** (path `/`). Inside an event context, nav items are (in order): **Overview**, **Applications**, **Communications**, **Reports**. Deeper module routes (Forms, Units, Scanning, etc.) are reached from the event dashboard launcher (BA01), not the primary header nav.

**FI-33.** The active navigation item (longest matching path prefix) is visually distinguished.

### 404 surface

**FI-34.** The `*` route renders a not-found surface: prominent "404" glyph, heading "Page not found", the unmatched path in `<code>`, and a primary action "Back to events" navigating to `/` via client-side routing (no full page reload).

### Edge cases and constraints

**FI-35.** On shell landing (`/`), `ContextSelector` shows organisation mode (no event selected). After entering an event, the header shows event context via `ContextSelector` / `useEvents()`.

**FI-36.** `PasswordChangeForm`'s `onSubmit` callback receives `{ newPassword, confirmPassword }`. The consumer invokes the Supabase password update (`supabase.auth.updateUser({ password: newPassword })`) and returns `Promise<{ error?: unknown }>`. `PasswordChangeForm` displays the error if the returned object contains a non-null `error` field.

**FI-37.** `PaceAppLayout`'s user menu only renders when all four of `userFullName`, `userEmail`, `onUserMenuSignOut`, and `onUserMenuChangePassword` are non-null. BA00 always supplies all four. `userFullName` is derived as `user?.user_metadata?.full_name ?? user?.email ?? 'User'`. `userEmail` is derived as `user?.email ?? ''`.

**FI-38.** The `OrganisationServiceProvider` requires `user` and `session` props sourced from `useUnifiedAuth()`. These are passed by the `AuthBridge` component rendered inside `UnifiedAuthProvider` in `main.tsx` (see BR-07).

---

## §5 Visual specification

Layout authority: `/login`, `/`, `*`, and authenticated shell chrome. Behavioural and permission rules stay in §4/§6.

### Shell variants

**Public auth surfaces** (`/login`; cross-ref `/register`, `/approvals/:token` owned by other slices):

- Full-viewport page content only; no `PaceAppLayout` / `PaceHeader` chrome.
- No `AppSwitcher`, no primary nav, no org/event context selector.
- Footer optional — defer to pace-core login page components.

**Authenticated main shell** (all protected routes including `/`):

- Vertical region stack (prototype: `.shell`; production: `PaceAppLayout`):
  1. **Header** — `AppSwitcher` (app=`base`), context-aware primary nav (BR-08), `ContextSelector` (org + event), `UserMenu`.
  2. **Main** — page `<Outlet />` (shell landing, feature pages, 404).
  3. **Footer** — `PaceFooter`.

**Scan runtime** (`/scanning/:scanPointId` in production): may render outside full shell chrome per BA13; not part of BA00 header contract.

### Shell landing (`/`)

- **PageHeader** — breadcrumb, h1 "Choose an event", subtitle with event count, actions (Find by code, New event).
- **Event tile grid** — `<section className="grid …">` of `BaseShellEventCard` (`EventCard` + logo resolution); default 4 visible with expand toggle.
- **AttentionQueue** — below grid when cross-event approval items exist.
- **Empty state** — zero events: `EmptyState` + create-event CTA.

### Global overlays and fallbacks

- **Root providers** (`src/main.tsx`): `QueryClientProvider` → `BrowserRouter` → `ToastProvider` → `UnifiedAuthProvider` → `AuthBridge` → `OrganisationServiceProvider` → `EventServiceProvider` → `App`.
- **Auth restore:** `SessionRestorationLoader` with "Restoring session…" during session restoration.
- **Idle timeout:** `InactivityWarningModal` via `renderInactivityWarning`.
- **Change password:** `Dialog` + `PasswordChangeForm` at shell level (`AuthenticatedShell`).
- **Not found (`*`):** not-found glyph, heading, path display, primary "Back to events" → `/`.

### Navigation behaviour

- Primary nav items switch by route context (BR-08); active item = longest path match.
- Scroll viewport to top on in-app route change (prototype parity).

### Route map (prototype → BASE)

Prototype uses hash routing (`#/…`); production uses `BrowserRouter` with flat paths and `ContextSelector` for event scope.

| Prototype hash path | BASE path | Shell notes |
|---|---|---|
| `#/login` | `/login` | Public |
| `#/` | `/` | Shell landing (event picker) |
| `#/events/:code` | `/event-dashboard` | In-event; event set via context |
| `#/events/:code/applications` | `/applications` | In-event nav item |
| `#/events/:code/communications` | `/communications` | In-event nav item |
| `#/events/:code/reports` | `/reports` | In-event nav item |
| `#/register` | — | Out of BA00 scope |
| `#/approvals/:token` | — | BA07 public route |
| unmatched | `*` | In-shell 404 |

### Implementation delta (pass 2)

- **`/` redirect-only:** production [`src/App.tsx`](../../src/App.tsx) currently `<Navigate to="/event-dashboard" />` instead of shell landing — align in pass 2.
- **Static 10-item nav:** production [`AuthenticatedShell.tsx`](../../src/components/layout/AuthenticatedShell.tsx) passes all registry nav items vs prototype context-aware four-item in-event nav — align in pass 2 (see BR-08).
- **404 presentation:** production [`BaseNotFoundPage.tsx`](../../src/pages/shell/BaseNotFoundPage.tsx) uses `Card` + link to `/event-dashboard` vs prototype not-found pattern with "Back to events" → `/`.
- **User menu:** prototype adds custom items ("All events", "Operator profile"); production uses pace-core change-password + sign-out only.
- **Event-scoped URLs:** prototype embeds `:code` in path; production uses flat routes + `useEvents()` selection.
- **Login redirect:** production `onSuccessRedirectPath="/"` then redirect chain to `/event-dashboard`; target post-login landing is `/` per prototype.

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
| 3 | Restoration complete AND `isAuthenticated === true` | Render shell landing (event picker) at `/` |

- `/` is a shell-level surface; it does not require a selected event.
- No `PagePermissionGuard` is required on `/` because it is not a permission-scoped feature page.

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

- Each `NavigationItem` in the nav array carries a `pageId` matching a `page_name` value in `rbac_app_pages` where the item is permission-scoped.
- `PaceAppLayout`'s internal `NavigationMenu` evaluates `read` permission for each item's `pageId` against the authenticated user's RBAC state.
- Items without a matching permitted page are hidden (not rendered, not disabled).
- Nav items are supplied by BR-08 context rules; RBAC dynamically hides inaccessible items.

### BR-05 — Session restoration

- Input: `isRestoring: boolean`, `hasTimedOut: boolean` from `useSessionRestoration()` (consumed internally by `SessionRestorationLoader`)
- `isRestoring === true` AND `hasTimedOut === false` → spinner shown; children not rendered
- `isRestoring === true` AND `hasTimedOut === true` → children rendered (graceful degradation)
- `isRestoring === false` → children rendered immediately

### BR-06 — Root landing contract

- Input: authenticated user lands on `/` after restoration.
- Output: render shell landing (event picker) — do not auto-redirect to `/event-dashboard`.
- Unauthenticated user on `/` → `/login` (via `ProtectedRoute`).

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

### BR-08 — Navigation items (context-aware)

Primary nav is derived from route context (prototype: `navItemsForRoute()` in `app.jsx`):

**Shell landing** (no event in route/context — path `/`):

```
[{ id: 'nav-events', label: 'Events', href: '/', pageId: 'event-dashboard' }]
```

**In-event context** (event selected — prototype path prefix `/events/:code`):

```
[
  { id: 'nav-overview',     label: 'Overview',       href: '/event-dashboard', pageId: 'EventDashboardPage' },
  { id: 'nav-applications', label: 'Applications',   href: '/applications',    pageId: 'ApplicationsPage' },
  { id: 'nav-comms',        label: 'Communications', href: '/communications',  pageId: 'CommunicationsPage' },
  { id: 'nav-reports',      label: 'Reports',        href: '/reports',         pageId: 'ReportsPage' },
]
```

Production maps prototype `href` values through [`baseRouteRegistry.ts`](../../src/config/baseRouteRegistry.ts). `pageId` values must match `rbac_app_pages.page_name` for permission-scoped items. Verify via Supabase MCP before shipping.

**Pass 2 note:** current production passes a static 10-item list from the full route registry; pass 2 should adopt this context-aware model.

### BR-09 — User display props derivation

`PaceAppLayout` requires `userFullName: string` and `userEmail: string` as non-null strings. Derive from `useUnifiedAuth()`:

```
userFullName = user?.user_metadata?.full_name ?? user?.email ?? 'User'
userEmail    = user?.email ?? ''
```

These must be non-null strings passed to `PaceAppLayout` at all times while the shell is rendered.

### BR-10 — Shell landing ownership

- `/` must render the global event picker (shell landing) — not redirect-only to `/event-dashboard`.
- Event dashboard launcher content is owned by BA01 at `/event-dashboard`; BA00 owns the cross-event picker at `/`.

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

- BA00 owns shell landing at `/`; selecting an event navigates to `/event-dashboard` (BA01). BA00 does not import BA01 dashboard components.
- All feature slices render within BA00's `PaceAppLayout` `Outlet`. BA00 provides the shell; they provide the content.

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
- `/` is the shell landing (event picker); it is not page-guarded.
- Import style in this slice follows root-first policy; scoped imports are exception-only.

## §10 Permission and access rules

| Route / Surface | Access rule |
|----------------|-------------|
| `/login` | Open to all. No auth required. |
| `/` (shell landing) | Authenticated users only (via `ProtectedRoute`). Renders event picker. No `PagePermissionGuard`. |
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

Given an unauthenticated user, when they enter valid credentials and click "Sign in", then they are redirected to `/` (shell landing).

Given an authenticated user, when they navigate to `/`, then the shell landing (event picker) is shown inside the authenticated shell.

Given an authenticated user, when they navigate to an unrecognised URL (e.g. `/does-not-exist`), then the 404 page is shown inside the shell.

Given an authenticated user on the 404 page, when they click "Back to events", then they are navigated to `/` via client-side routing (no full page reload).

Given an authenticated user operating inside an event, when they hard refresh the browser on an event-scoped route, then the last selected event is restored from pace-core `EventService` persistence and event-scoped routes remain reachable without returning to shell landing.

Given an authenticated user on shell landing with more than four events, when they view the page, then the first four event tiles are shown with a "Show all" control.

Given an authenticated user on shell landing, when events have pending applications, then an AttentionQueue section lists cross-event approval items.

Given an authenticated user on shell landing, when primary nav is visible, then only the "Events" nav item is shown.

Given an authenticated user operating inside an event, when primary nav is visible, then Overview, Applications, Communications, and Reports items are shown (RBAC permitting).

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
- Verify `/` decision tree: restoration hold, unauthenticated redirect to `/login`, authenticated render of shell landing (event picker) at `/`.
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
- Do not add `PagePermissionGuard` or feature content owned by other slices to `/`; it remains shell landing only.
- Do not auto-redirect authenticated users from `/` to `/event-dashboard` (prototype shows event picker at `/`).
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
