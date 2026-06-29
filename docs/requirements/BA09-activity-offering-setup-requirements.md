# BA09 — Activity Offering and Session Setup

## Slice metadata

- Status: Draft
- Depends on: BA00 (authenticated shell), BA18 (seed data)
- Backend impact: Read + write contracts; `base_activity_offering` and `base_activity_session` tables confirmed live in dev-db `rkytnffgmwnnmewevqgp`. RLS and CHECK constraints are forward specifications. RBAC-checked RLS migration required as a build prerequisite (see §14 and §17).
- Frontend impact: UI

---

## 2. Overview

BA09 delivers the organiser-facing surface for creating and managing activity offerings and their sessions within a BASE event. Organisers access `/activities` to view and manage all offerings for the currently selected event, and navigate to `/activities/:offeringId` to edit a single offering's details and configure its sessions. Each offering may link to a TRAC activity, define a booking window, and carry optional cost and payment deadline fields. Sessions carry required time and capacity fields, and optional session name and location information. This slice does not include participant booking, booking oversight, or scanning — those belong to BA10, BA11, and BA12–BA16 respectively.

---

## 3. What this slice delivers

### Purpose

Event organisers need a dedicated setup surface to define what activity offerings are available for an event, configure the booking windows and costs for those offerings, and schedule the individual sessions within each offering — including their times, capacities, and locations. This slice delivers that setup workflow entirely within the BASE organiser shell.

### Surfaces

- **`/activities`** — gated page listing all activity offerings for the currently selected event, with actions to create a new offering and navigate to the offering editor.
- **`/activities/:offeringId`** — gated page with a full-page single-column layout: an offering summary `Card` at the top (editable via `Dialog`) followed by a sessions `DataTable`. Session create and edit actions open controlled `Dialog` forms.

### Boundaries

- This slice does not own participant booking (`base_activity_booking`) — that belongs to BA10 in pace-portal.
- This slice does not own booking oversight or booking state management — that belongs to BA11.
- This slice does not own scanning setup, runtime, or tracking — those belong to BA12–BA16.
- This slice does not own unit preference submission — that belongs to BA08.
- This slice does not write to `trac_activity` — BASE reads TRAC activity records for linkage only; all TRAC data management is TRAC-owned.
- Waitlist, booking-state rules, and participant-facing interfaces are explicitly out of scope for this slice.

### Architectural posture

- All reads and mutations use **`useSecureSupabase()`** from `@solvera/pace-core/rbac`; no service-role client in route code.
- Write operations for offerings and sessions use direct Supabase table writes against RBAC-checked RLS policies (Kusi Q-1 resolution 2026-05-11 — Option A). These RLS policies are forward specifications; the migration is a §14 build prerequisite.
- > **Route read access:** Enforced by the app authenticated shell / PaceAppLayout `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). The page component must not wrap content in an outer `PagePermissionGuard operation="read"` unless this slice explicitly requires a **scoped read** override (`scope={{ organisationId, eventId, appId }}`).
- Mutation affordances use `PagePermissionGuard` per §10.
- Event context is resolved via **`useEvents()`** — use `selectedEvent.id` as the `event_id` at all data boundaries.

### Page-level guards and evaluation ordering

**Both routes — `/activities` and `/activities/:offeringId`**

1. > **Route read access:** Enforced by the app authenticated shell / PaceAppLayout `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). The page component must not wrap content in an outer `PagePermissionGuard operation="read"` unless this slice explicitly requires a **scoped read** override (`scope={{ organisationId, eventId, appId }}`).

2. **Route read access** is enforced by the authenticated shell / `PaceAppLayout` `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). If access is denied, **`AccessDenied`** is shown immediately; no-event messaging does not replace or precede denial.
3. If the guard is loading and no custom `loadingFallback` prop is supplied, **`PagePermissionGuard`** renders `null` — neither children nor the denial state is shown.
4. If the guard permits and **no event is selected** (`selectedEvent` is null or `selectedEvent.id` is falsy), the page shows a blocking **`Card`** instructing the user to select an event in the shell header. Data fetches do not run.
5. If the guard permits and **an event is selected**, data loads for that `event_id`.

**Scope object when context is partially absent**

Pass `organisationId` and `eventId` from **`useEvents()`** / `useUnifiedAuth()`. When no event is selected, `eventId` is `null` or `undefined` — never a sentinel string. The guard still evaluates against the available scope; the empty-event state fires only after the guard passes.

**Null Supabase client**

If **`useSecureSupabase()`** returns `null` (transient auth client initialisation), render a centred **`LoadingSpinner`** in the main content region. Do not show an error; the client resolves automatically once auth state settles.

---

## 4. Functional specification

Prefix legend: **`AL`** /activities list page-level, **`AO`** /activities/:offeringId page-level, **`OL`** offering list, **`OE`** offering editor, **`SL`** session list, **`SE`** session editor.

### `/activities` — page entry

1. **AL-PE-01 —** Navigating to `/activities` renders inside the BA00 authenticated shell; no mandatory query parameters.
2. **AL-PE-02 —** With an event selected, the page loads all `base_activity_offering` rows for `selectedEvent.id`.
3. **AL-PE-03 —** Page chrome: `h1` "Activities" and a subtitle naming the selected event and describing the surface ("Manage activity offerings and sessions for this event.").

### `/activities` — loading states

4. **AL-LS-01 —** While the offerings query is unresolved and the guard permits with an event selected, the offerings `DataTable` receives `isLoading` true (table shows built-in loading row with `LoadingSpinner` per pace-core `DataTable` behaviour).

### `/activities` — empty states

5. **AL-ES-01 —** Event selected, zero offerings: the `DataTable` shows its empty state with copy "No activity offerings have been created for this event."
6. **AL-ES-02 —** No event selected: the page shows a blocking `Card` with `CardTitle` "No event selected" and `CardDescription` "Select an event from the header to manage its activities." The `DataTable` does not render; data fetches do not run.

### `/activities` — error states

7. **AL-ER-01 —** Offerings list fetch failure: `Alert` `variant="destructive"` with the normalised error message from `normalizeSupabaseError` and a **Retry** control that refetches the offerings query.

### `/activities` — offerings list content

8. **OL-PC-01 —** The offerings list is a **`DataTable`** with title "Activity Offerings" and a description showing the offering count and selected event name.
9. **OL-PC-02 —** Columns (in order): **Name** (text, sortable), **Sessions** (integer count, sortable), **Booking Opens** (formatted timestamptz or "—" if null), **Booking Closes** (formatted timestamptz or "—" if null), **Cost** (formatted currency or "—" if null), **TRAC Activity** (linked activity name or "—" if null).
10. **OL-PC-03 —** Each row displays a `Badge` showing the session count (`'solid-sec-muted'` variant) and a booking window status `Badge`: `'solid-main-normal'` "Booking open" when the current timestamp is within `[booking_open_at, booking_close_at]`; `'outline-acc-muted'` "Booking closed" otherwise (including when booking window fields are null).
11. **OL-PC-04 —** Rows are ordered by `name` ascending on initial load.
12. **OL-PC-05 —** Clicking a row, or a dedicated **View / Edit** row action, navigates to `/activities/:offeringId` for that offering.

### `/activities` — create offering

13. **OL-PA-01 —** A **"Create offering"** button above the `DataTable` (outside the DataTable toolbar — the DataTable's built-in creation is disabled) opens a controlled `Dialog` with a create-offering form.
14. **OL-PA-02 —** Create-offering form fields (all within `DialogBody`):
    - **Name** — required text field, `placeholder="e.g. Rock Climbing"`
    - **TRAC Activity** — optional `Select`; options are all `trac_activity` rows for `selectedEvent.id`, sorted by `name`; includes a "None" option as the first item
    - **Booking Opens** — optional `DateTimeField` for `booking_open_at`
    - **Booking Closes** — optional `DateTimeField` for `booking_close_at`; must be ≥ Booking Opens when both are set (BR-BW)
    - **Cost** — optional numeric input for `cost`, `placeholder="0.00"`
    - **Payment Due** — optional `DateTimeField` for `payment_due_at`
    - **Allow Waitlist** — boolean toggle for `allow_waitlist`; default `false`; no validation error (always valid)
15. **OL-PA-03 —** `DialogFooter` contains `SaveActions` with Cancel and Save. Save submits the form.
16. **OL-PA-04 —** On submit, client-side Zod validation runs first (BR-NAME-REQUIRED, BR-BW). If validation passes, the row is inserted into `base_activity_offering` with `event_id: selectedEvent.id` and `organisation_id` resolved from the event context (BR-ORG-RESOLVE). Success: `Dialog` closes, toast "Offering created", list refreshes. Failure: toast with normalised error; `Dialog` stays open.

### `/activities` — delete offering (from list)

15. **OL-PA-05 —** A **Delete** row action appears on each offering row. Pressing it opens a `Dialog` confirmation: Title "Delete offering", Description "Delete the offering "{name}"? All sessions must be removed before an offering can be deleted." with a **Check sessions** disabled note when sessions exist, or a **Delete** destructive button when zero sessions exist (BR-DEL-OFFERING). Cancel closes without action.
16. **OL-PA-06 —** On confirm, the row is deleted from `base_activity_offering`. Success: toast "Offering deleted", list refreshes. Failure: toast with normalised error.

### `/activities/:offeringId` — page entry

17. **AO-PE-01 —** Navigating to `/activities/:offeringId` renders inside the BA00 shell with the `offeringId` path segment identifying the target offering.
18. **AO-PE-02 —** On load, the page fetches the offering row and its associated sessions for `offeringId`.
19. **AO-PE-03 —** Page chrome: `h1` displaying the offering name; a subtitle "Activity offering — {selected event name}".
20. **AO-PE-04 —** A **Back to offerings** link or button navigates back to `/activities`.

### `/activities/:offeringId` — loading states

21. **AO-LS-01 —** While the offering and session queries are unresolved, a centred `LoadingSpinner` is shown in the main content region.

### `/activities/:offeringId` — empty states

22. **AO-ES-01 —** No event selected: blocking `Card` with `CardTitle` "No event selected" and `CardDescription` "Select an event from the header to view this offering." Fetches do not run.
23. **AO-ES-02 —** `offeringId` not found (404 from query): `Alert` `variant="destructive"` with copy "This offering could not be found. It may have been deleted." and a link back to `/activities`.

### `/activities/:offeringId` — error states

24. **AO-ER-01 —** Offering fetch failure: `Alert` `variant="destructive"` with the normalised error and a Retry control.
25. **AO-ER-02 —** Sessions fetch failure: `Alert` `variant="destructive"` within the sessions region with the normalised error and a Retry control.

### `/activities/:offeringId` — offering summary card

26. **OE-PC-01 —** The top section renders a `Card` with `CardHeader` containing the offering name as `CardTitle` and an **Edit offering** `Button` (`variant="outline"`) that opens the edit-offering `Dialog`.
27. **OE-PC-02 —** `CardContent` displays offering detail in a definition-list style grid: **TRAC Activity** (linked name or "None"), **Booking Opens** (formatted timestamptz or "—"), **Booking Closes** (formatted timestamptz or "—"), **Booking Status** (`Badge` — `'solid-main-normal'` "Booking open" or `'outline-acc-muted'` "Booking closed"), **Cost** (formatted currency or "—"), **Payment Due** (formatted timestamptz or "—").

### `/activities/:offeringId` — edit offering

28. **OE-PA-01 —** The edit-offering `Dialog` opens pre-populated with the current offering values. All fields match the create-offering form (OL-PA-02). Save submits an UPDATE to `base_activity_offering`. Success: `Dialog` closes, offering summary refreshes, toast "Offering saved". Failure: toast with normalised error; `Dialog` stays open.

### `/activities/:offeringId` — sessions list

29. **SL-PC-01 —** Below the offering `Card`, a **`DataTable`** with title "Sessions" and a description "Sessions for this offering." lists all `base_activity_session` rows for `offeringId`.
30. **SL-PC-02 —** Columns (in order): **Session Name** (text, sortable; "—" if null), **Starts** (formatted timestamptz, sortable), **Ends** (formatted timestamptz, sortable), **Capacity** (integer, sortable), **Location** (text or "—" if null).
31. **SL-PC-03 —** Each row shows a `Badge` `'solid-sec-muted'` for the capacity value.
32. **SL-PC-04 —** Rows are ordered by `start_time` ascending on initial load.
33. **SL-PC-05 —** Empty state: "No sessions have been added to this offering yet."

### `/activities/:offeringId` — create session

34. **SE-PA-01 —** An **"Add session"** button above the sessions `DataTable` (outside the DataTable built-in creation, which is disabled) opens a controlled `Dialog` with a create-session form.
35. **SE-PA-02 —** Create-session form fields (all within `DialogBody`):
    - **Session name** — optional text field for `session_name`, `placeholder="e.g. Morning session"`
    - **Start Time** — required `DateTimeField` for `start_time`
    - **End Time** — required `DateTimeField` for `end_time`; must be after Start Time (BR-SO)
    - **Location** — optional text field for `location_display_name`, `placeholder="e.g. Main arena, Campsite B"`
    - **Capacity** — required numeric input for `capacity` (positive integer, BR-CAP), `placeholder="0"`
36. **SE-PA-03 —** `DialogFooter` contains `SaveActions` with Cancel and Save.
37. **SE-PA-04 —** On submit, client-side Zod validation runs first (BR-SO, BR-CAP). If validation passes, insert into `base_activity_session` with `offering_id: offeringId`; include `session_name` (nullable) and `location_display_name` (nullable) in the payload. Success: `Dialog` closes, sessions list refreshes, toast "Session added". Failure: toast with normalised error; `Dialog` stays open.

### `/activities/:offeringId` — edit session

38. **SE-PA-05 —** An **Edit** row action on each session row opens the edit-session `Dialog` pre-populated with current values. All fields match the create-session form (SE-PA-02). Save submits an UPDATE to `base_activity_session`. Success: `Dialog` closes, sessions list refreshes, toast "Session saved". Failure: toast with normalised error; `Dialog` stays open.

### `/activities/:offeringId` — delete session

39. **SE-PA-06 —** A **Delete** row action on each session row opens a `Dialog` confirmation: Title "Delete session", Description "Delete the {formatted start_time} session? If participants have booked this session, their bookings will be affected." Confirm label "Delete". Variant `destructive`. Cancel closes without action.
40. **SE-PA-07 —** On confirm, check the booking count for this session from `base_activity_booking` (BR-DEL-SESSION). If bookings exist, a secondary `Alert` `variant="destructive"` warns "This session has {count} booking(s). Deleting it will remove those bookings." with a final confirm. If no bookings, delete immediately. Success: toast "Session deleted", list refreshes. Failure: toast with normalised error.

### Both routes — permission-conditional rendering

41. **PA-PERM-01 —** When the authenticated user has `read:page.activities` but lacks `create:page.activities`, the "Create offering" button and "Add session" button are not rendered.
42. **PA-PERM-02 —** When the user lacks `update:page.activities`, the Edit offering button and Edit session row actions are not rendered.
43. **PA-PERM-03 —** When the user lacks `delete:page.activities`, the Delete row actions are not rendered.
44. **PA-PERM-04 —** When the user lacks `read:page.activities` entirely, both routes render `AccessDenied`.

### Non-empty verification

45. **AL-VER-01 —** Non-empty state verification for both routes uses BA18 seed data, not route-local fixtures.

---

## 5. Visual specification

- Prototype reference: `pace-prototype/apps/pace-base/pages/UnitsActivitiesScanPage.jsx` (`ActivitiesPage`).

### Prototype layout summary

1. **PageHeader** — title "Activities"; actions: secondary "All bookings" → bookings route, primary "New offering".
2. **KPI row** — Offerings, Total sessions, Combined capacity, Bookings (% filled).
3. **Offering card grid** — name, provider, fee, session count, capacity bar, "Manage sessions" action.
4. **Empty state** — "No activities yet" with Add offering.

### Route map

| Prototype | BASE |
|---|---|
| `#/events/:code/activities` | `/activities` |

### Implementation delta (pass 2)

- **`/activities` list:** Prototype uses a **KPI row** then an **offering card grid** (provider, fee, sessions, capacity bar, "Manage sessions"). Production uses a **`DataTable`** with create/edit/delete **Dialogs** — retain KPI semantics above the table (four summary tiles matching prototype KPI labels).
- **Primary action:** Prototype places **"New offering"** in `PageHeader` right; production may use **"Create offering"** immediately below the heading block (left-aligned) per Layout below.
- **`/activities/:offeringId`:** No prototype screen — "Manage sessions" is a stub. Session management layout in this doc is production-only.

### Layout — `/activities`

- **`main`** uses Standard 07 page padding (`px-6 py-8` baseline unless the consuming app shell standard overrides).
- **Heading block:** `h1` "Activities", `p` subtitle with event name and surface description.
- **KPI row** (four tiles): Offerings, Total sessions, Combined capacity, Bookings (% filled) — matching prototype `ActivitiesPage` before the offerings surface.
- **"Create offering" button:** `Button` `variant="default"` placed immediately below the KPI row, left-aligned. Label "Create offering".
- **`DataTable`:** full-width below the Create button. `initialPageSize={25}`.
- **Modal dialogs:** centred `Dialog` for confirmations and forms. No drawers.

### Components — offerings list

- **`Card`:** wraps the `DataTable` (the `DataTable` itself renders a `Card` internally per pace-core2 `DataTable` component behaviour — no outer `Card` wrapper needed).
- **`DataTable` features config:**

```ts
features: {
  search:           true,
  pagination:       true,
  sorting:          true,
  export:           false,
  import:           false,
  grouping:         false,
  columnVisibility: false,
  editing:          false,   // edit via custom row action opening Dialog
  creation:         false,   // create via dedicated button above DataTable
  filtering:        false,
  selection:        false,
  deletion:         false,   // delete via custom row action
  deleteSelected:   false,
  columnReordering: false,
  hierarchical:     false,
}
```

- **Columns** (header copy → width hint): Name → medium-wide, Sessions → narrow, Booking Opens → medium, Booking Closes → medium, Cost → narrow, TRAC Activity → medium.
- **Sessions cell:** integer count displayed as `Badge` `variant='solid-sec-muted'`.
- **Booking Status cell:** `Badge` `variant='solid-main-normal'` with label "Booking open" when `now()` is within `[booking_open_at, booking_close_at]`; `Badge` `variant='outline-acc-muted'` with label "Booking closed" otherwise. When booking window fields are null, show `Badge` `variant='outline-acc-muted'` "Booking closed".
- **Row actions (rightmost column):** **Edit** button (`variant="outline"`, `size="small"`) navigates to `/activities/:offeringId`; **Delete** button (`variant="destructive"`, `size="small"`) opens the delete confirmation `Dialog`.
- **Empty cell values:** null timestamptz fields, null cost, and null TRAC activity render as "—" (em dash) in the table cell.

### Components — create / edit offering Dialog

- **`Dialog`** controlled by `open`/`onOpenChange`. Title: "Create offering" or "Edit offering".
- **`DialogBody`** contains `Form` with the following `FormField` elements in order:
  - **Name** — `FormField` `name="name"` `label="Name"` `required`. Renders `Input` `type="text"` `placeholder="e.g. Rock Climbing"`. Error copy: "Offering name is required."
  - **TRAC Activity** — `FormField` `name="trac_activity_id"` `label="TRAC Activity"`. Renders `Select` with a first `SelectItem` value `null` label "None", followed by one `SelectItem` per `trac_activity` row (value = `id`, label = `name`), sorted by `name` ascending. No error copy (optional field).
  - **Booking Opens** — `FormField` `name="booking_open_at"` `label="Booking Opens"`. Renders `DateTimeField` `placeholder="Select date and time"`. No error copy (optional field unless BR-BW fires — see below).
  - **Booking Closes** — `FormField` `name="booking_close_at"` `label="Booking Closes"`. Renders `DateTimeField` `placeholder="Select date and time"`. Error copy (cross-field, shown on this field when BR-BW fires): "Booking close time must be on or after booking open time."
  - **Cost** — `FormField` `name="cost"` `label="Cost"`. Renders `Input` `type="number"` `placeholder="0.00"` `min="0"` `step="0.01"`. No error copy (optional field).
  - **Payment Due** — `FormField` `name="payment_due_at"` `label="Payment Due"`. Renders `DateTimeField` `placeholder="Select date and time"`. No error copy (optional field).
  - **Allow Waitlist** — `FormField` `name="allow_waitlist"` `label="Allow waitlist"`. Renders a `Switch` or `Checkbox`. Default value `false`. No error copy (boolean toggle; maps to `allow_waitlist boolean NOT NULL DEFAULT false` on `base_activity_offering`).
- **`DialogFooter`** contains `SaveActions` with `onCancel` (closes `Dialog`) and `saveType="submit"`.

### Components — delete offering Dialog

- **`Dialog`** controlled open. Title: "Delete offering".
- **`DialogBody`:** `p` "Delete the offering "{name}"?"
  - When the offering has one or more sessions: `Alert` `variant="destructive"` with `AlertDescription` "All sessions must be removed before this offering can be deleted." Delete button is disabled and labelled "Cannot delete — sessions exist".
  - When zero sessions: `p` "This action cannot be undone."
- **`DialogFooter`:** Cancel `Button` `variant="outline"` + Delete `Button` `variant="destructive"` (disabled state applied per above).

### Layout — `/activities/:offeringId`

- **`main`** with Standard 07 padding.
- **Heading block:** `h1` displaying the offering `name`; `p` "Activity offering — {event name}"; **Back to offerings** `Button` `variant="ghost"` `size="small"` placed above the `h1`, navigating to `/activities`. (Use `variant="ghost"` in the heading block context. In the offering-not-found error state, the same navigation action uses `variant="outline"` because it appears as a standalone recovery action without heading chrome — see States section below.)
- **Offering summary `Card`:** full-width, placed immediately below the heading block.
  - `CardHeader`: `CardTitle` = offering name; `CardDescription` = "Offering details"; **Edit offering** `Button` `variant="outline"` positioned right-aligned within the header row.
  - `CardContent`: definition grid rendered as a CSS `grid grid-cols-[auto_1fr]` of `<div>` pairs — left `<div>` carries the label in muted text (`text-muted-foreground text-sm`), right `<div>` carries the value. Row order: TRAC Activity, Booking Opens, Booking Closes, Booking Status (Badge), Cost, Payment Due. Do not use `<dl>/<dt>/<dd>` — use plain `<div>` pairs inside the grid container.
- **Sessions section:** full-width below the offering `Card`. "Add session" `Button` `variant="default"` above the sessions `DataTable`.
- **Sessions `DataTable`:** full-width.

### Components — sessions DataTable

- **`DataTable` features config:**

```ts
features: {
  search:           true,
  pagination:       true,
  sorting:          true,
  export:           false,
  import:           false,
  grouping:         false,
  columnVisibility: false,
  editing:          false,   // edit via custom row action
  creation:         false,   // create via dedicated "Add session" button
  filtering:        false,
  selection:        false,
  deletion:         false,   // delete via custom row action
  deleteSelected:   false,
  columnReordering: false,
  hierarchical:     false,
}
```

- **Columns** (header copy → width hint): Session Name → medium, Starts → medium, Ends → medium, Capacity → narrow, Location → medium.
- **Capacity cell:** integer rendered as `Badge` `variant='solid-sec-muted'`.
- **Row actions (rightmost column):** **Edit** `Button` `variant="outline"` `size="small"`; **Delete** `Button` `variant="destructive"` `size="small"`.
- **Empty cell values:** null Session Name and null Location render as "—". Starts and Ends are always present (required fields).
- **Date/time formatting:** all timestamptz values formatted via `formatDateTime` from `@solvera/pace-core/utils`.

### Components — create / edit session Dialog

- **`Dialog`** controlled by `open`/`onOpenChange`. Title: "Add session" or "Edit session".
- **`DialogBody`** contains `Form` with the following `FormField` elements in order:
  - **Session name** — `FormField` `name="session_name"` `label="Session name"`. Renders `Input` `type="text"` `placeholder="e.g. Morning session"`. No error copy (optional field).
  - **Start Time** — `FormField` `name="start_time"` `label="Start Time"` `required`. Renders `DateTimeField` `placeholder="Select date and time"`. Error copy: "Start time is required."
  - **End Time** — `FormField` `name="end_time"` `label="End Time"` `required`. Renders `DateTimeField` `placeholder="Select date and time"`. Error copy (when BR-SO fires): "End time must be after start time."
  - **Location** — `FormField` `name="location_display_name"` `label="Location"`. Renders `Input` `type="text"` `placeholder="e.g. Main arena, Campsite B"`. No error copy (optional field).
  - **Capacity** — `FormField` `name="capacity"` `label="Capacity"` `required`. Renders `Input` `type="number"` `placeholder="0"` `min="1"` `step="1"`. Error copy (when BR-CAP fires): "Capacity must be a positive whole number."
- **`DialogFooter`** contains `SaveActions` with `onCancel` (closes `Dialog`) and `saveType="submit"`.

### Components — delete session Dialog

- **`Dialog`** controlled open. Title: "Delete session".
- **Booking count fetch:** the booking count query (§7.1 "Booking count for session") is fired immediately when the delete dialog opens (`onOpenChange` with open=true). While the count is loading, show a `LoadingSpinner` in the `DialogBody` in place of the body content. The Delete button is disabled during this loading phase.
- **`DialogBody`:**
  - Primary text: `p` "Delete the session starting {formatted start_time}?"
  - When booking count > 0: `Alert` `variant="destructive"` with `AlertDescription` "This session has {count} booking(s). Deleting it will remove those bookings permanently." A second confirmation checkbox or acknowledgement is shown: `Checkbox` with label "I understand this will remove existing bookings." Delete button is disabled until the checkbox is checked.
  - When booking count = 0: `p` "This action cannot be undone."
- **`DialogFooter`:** Cancel `Button` `variant="outline"` + Delete `Button` `variant="destructive"` (disabled until checkbox checked when bookings exist).

### States

- **Loading (guard loading):** `null` per `PagePermissionGuard` default; no skeleton visible until auth client resolves.
- **Loading (Supabase client null):** centred `LoadingSpinner` in main content region.
- **Loading (data fetch — /activities):** `DataTable` `isLoading` rows (built-in loading spinner per pace-core `DataTable`).
- **Loading (data fetch — /activities/:offeringId):** centred `LoadingSpinner` in the main content region until both offering and session queries resolve.
- **No event selected (`/activities`):** full-width `Card` directly below the heading block. `CardHeader` with `CardTitle` "No event selected" and `CardDescription` "Select an event from the header to manage its activities." The `DataTable` and Create button do not render.
- **No event selected (`/activities/:offeringId`):** full-width `Card` directly below the heading block with `CardTitle` "No event selected" and `CardDescription` "Select an event from the header to view this offering." The offering `Card` and sessions section do not render.
- **Offering not found (`/activities/:offeringId`):** `Alert` `variant="destructive"` with copy "This offering could not be found. It may have been deleted." and a `Button` `variant="outline"` "Back to offerings" linking to `/activities`.
- **Empty (/activities):** `DataTable` empty state "No activity offerings have been created for this event."
- **Empty (sessions):** sessions `DataTable` empty state "No sessions have been added to this offering yet."
- **Error:** `Alert` `variant="destructive"` with normalised error and Retry control (per §4 items 7, 24, 25).
- **Success mutations:** `toast()` with `variant='success'` for all create/update/delete successes.

### Interactions

- **`window.confirm` is not used anywhere in this slice.** All confirmations use pace-core `Dialog`.
- **Dialog focus:** `DialogContent` calls `focusFirstFocusableIn` on open; Escape and backdrop click close the dialog and return focus to the trigger.
- **Form validation:** Zod validation runs on submit (`mode='onSubmit'`). Field-level errors appear inline below each field. Cross-field errors (BR-BW) surface on the `booking_close_at` field. Cross-field errors (BR-SO) surface on the `end_time` field.
- **DataTable row click:** navigates to `/activities/:offeringId` for the offering row.
- **TRAC activity selector:** scoped to `trac_activity` rows for `selectedEvent.id`. The "None" option resolves to `trac_activity_id: null` in the payload.

### Confirmation dialog copy

| Flow | Title | Description | Confirm label | Variant |
|------|-------|-------------|---------------|---------|
| Delete offering (sessions exist) | Delete offering | Delete the offering "{name}"? All sessions must be removed before this offering can be deleted. | Cannot delete — sessions exist (disabled) | destructive |
| Delete offering (no sessions) | Delete offering | Delete the offering "{name}"? This action cannot be undone. | Delete | destructive |
| Delete session (no bookings) | Delete session | Delete the session starting {formatted start_time}? This action cannot be undone. | Delete | destructive |
| Delete session (bookings exist) | Delete session | Delete the session starting {formatted start_time}? This session has {count} booking(s). Deleting it will remove those bookings permanently. (+ checkbox) | Delete (disabled until checkbox) | destructive |

### Permission matrix (visual)

| Permission | `/activities` | Create offering | Edit offering | Delete offering | Add session | Edit session | Delete session |
|---|---|---|---|---|---|---|---|
| No read | `AccessDenied` | hidden | hidden | hidden | hidden | hidden | hidden |
| Read only | list visible | hidden | hidden | hidden | hidden | hidden | hidden |
| Read + create | list visible | visible | hidden | hidden | visible | hidden | hidden |
| Read + update | list visible | hidden | visible | hidden | hidden | visible | hidden |
| Read + delete | list visible | hidden | hidden | visible | hidden | hidden | visible |
| Read + all | list visible | visible | visible | visible | visible | visible | visible |

---

## 6. Business rules

### BR-NAME-REQUIRED — Offering name: required and trimmed

**Input:** `name` field value from the create/edit offering form.
**Output:** valid non-empty string, or validation error.
**Rule:** trim leading and trailing whitespace; if empty after trim → validation error "Offering name is required." Must be non-empty after trim.
**DB enforcement:** `name` column is `text NOT NULL` on `base_activity_offering`. Application-level Zod validation runs first; DB constraint is the fallback safety gate.
**UI failure class:** inline field error below the Name field.

### BR-SO — Session time order

**Input:** `start_time` (timestamptz) and `end_time` (timestamptz) from the create/edit session form.
**Output:** valid time pair where `start_time < end_time`, or validation error.
**Rule:** `end_time` must be strictly after `start_time`. If `end_time <= start_time` → validation error "End time must be after start time."
**DB enforcement:** `base_activity_session_time_order` CHECK constraint (`start_time < end_time`) on `base_activity_session`. Forward spec — constraint migration required.
**Boundary:** DB write rejection on INSERT/UPDATE when the CHECK constraint fires. If the DB constraint fires (e.g. clock skew or timezone edge case), surface via `normalizeSupabaseError` from `@solvera/pace-core/utils`.
**UI failure class:** inline field error on the `end_time` field (cross-field Zod refinement applied at form level).

### BR-CAP — Session capacity positive

**Input:** `capacity` field value (integer) from the create/edit session form.
**Output:** valid positive integer ≥ 1, or validation error.
**Rule:** `capacity` must be a positive integer (≥ 1). Zero or negative → validation error "Capacity must be a positive whole number." Non-integer input → same error.
**DB enforcement:** `base_activity_session_capacity_positive` CHECK constraint (`capacity > 0`) on `base_activity_session`. Forward spec — constraint migration required.
**UI failure class:** inline field error on the `capacity` field (`z.number().int().positive()`).

### BR-BW — Booking window ordering

**Input:** `booking_open_at` and `booking_close_at` (timestamptz) from the create/edit offering form.
**Output:** valid pair where `booking_close_at >= booking_open_at`, or validation error.
**Rule:** when both fields are non-null, `booking_close_at` must not be earlier than `booking_open_at`. If `booking_close_at < booking_open_at` → validation error "Booking close time must be on or after booking open time." When either field is null, this rule does not fire.
**DB enforcement:** `base_activity_offering_booking_window_order` CHECK constraint (`booking_close_at >= booking_open_at`) on `base_activity_offering`. Forward spec — constraint migration required.
**UI failure class:** inline field error on the `booking_close_at` field (cross-field Zod refinement).

### BR-TRAC — TRAC event context guard

**Input:** `trac_activity_id` (uuid or null) on `base_activity_offering`; `event_id` on `trac_activity`.
**Output:** valid linkage where `trac_activity.event_id = base_activity_offering.event_id`, or DB write rejection.
**Rule:** when TRAC linkage is provided, the linked `trac_activity` must belong to the same event as the offering.
**DB enforcement:** trigger `base_activity_offering_trac_event_context_guard` invoking `base_activity_offering_enforce_trac_event_context()` on `base_activity_offering`. Forward spec — trigger migration required.
**UI prevention:** the TRAC activity `Select` is scoped to `trac_activity` rows where `event_id = selectedEvent.id`, preventing selection of a mismatched TRAC activity. Any error response from the DB trigger is surfaced via `normalizeSupabaseError`.
**Read-only from BASE:** BASE does not write to `trac_activity`.

### BR-SCOPE — Event scope

**Input:** `event_id` (varchar) on `base_activity_offering`; `offering_id` (FK) on `base_activity_session`.
**Enforcement:** all offering queries filter by `event_id = selectedEvent.id`. All session queries join through `offering_id` to the parent offering. RLS on `base_activity_offering` and `base_activity_session` enforces scope at the database layer using `check_rbac_permission_with_context('read:page.activities', 'activities', organisation_id, event_id::text, get_app_id('BASE'))`.

### BR-DEL-OFFERING — Delete offering guard

**Input:** the target `base_activity_offering` row; count of associated `base_activity_session` rows.
**Rule:** an offering may only be deleted when it has zero associated sessions. Before presenting the delete confirm button as enabled, query the session count for the offering. If count > 0, disable the Delete button and show the "All sessions must be removed" copy. If count = 0, enable Delete.
**DB enforcement:** FK constraint on `base_activity_session.offering_id` prevents orphaned sessions; the check is also enforced UI-side.
**UI failure class:** disabled Delete button with explanatory copy in the delete confirmation dialog.

### BR-DEL-SESSION — Delete session booking check

**Input:** the target `base_activity_session` row; count from `base_activity_booking` where `session_id = session.id`.
**Rule:** when booking count > 0, show a warning and require acknowledgement before deletion proceeds. When booking count = 0, deletion proceeds directly after confirmation.
**DB enforcement:** `base_activity_booking` FK constraint on `session_id` may cascade or reject depending on the migration — build agents must check the constraint type when `base_activity_booking` is migrated. The UI check is a safeguard, not a substitute for DB enforcement.
**Build prerequisite:** `base_activity_booking` must exist and be queryable to perform the count check. If the table is absent (forward spec at time of build), the count check defaults to 0 — delete proceeds without the booking warning. Note this as a build-time conditional.
**UI failure class:** acknowledgement checkbox + disabled Delete button until checked.

### BR-ORG-RESOLVE — Organisation ID resolution for inserts

**Applies to:** `base_activity_offering` create.
**Rule:** before any insert into `base_activity_offering`, the `organisation_id` must be confirmed from the event context. Use `selectedEvent.organisation_id` if present on the `EventStub`, or fetch from `core_events.organisation_id` for the current `event_id`. Use the returned value as `organisation_id` in the insert payload. If the resolution fails, abort the insert and show an error toast.

### BR-DATETIME — Date/time display

**Input:** any `timestamptz` field (`start_time`, `end_time`, `booking_open_at`, `booking_close_at`, `payment_due_at`).
**Output:** human-readable string formatted via `formatDateTime` from `@solvera/pace-core/utils`. Apply consistently across all date/time display contexts in this slice.

---

## 7. API / Contract

### 7.1 Read contracts (`useSecureSupabase()`)

All queries are scoped to `selectedEvent.id`. If `useSecureSupabase()` returns `null`, gate all queries and show the null-client loading state per §3.

**Offerings list**

```
from('base_activity_offering')
.select(`
  id,
  name,
  trac_activity_id,
  booking_open_at,
  booking_close_at,
  cost,
  payment_due_at,
  allow_waitlist,
  event_id,
  organisation_id,
  trac_activity:trac_activity (
    id,
    name,
    event_id
  ),
  sessions:base_activity_session ( count )
`)
.eq('event_id', selectedEvent.id)
.order('name', { ascending: true })
```

_Session count is resolved via the embedded `count` aggregate. Adjust the PostgREST embed syntax to match generated types for the FK relationship name._

**Single offering**

```
from('base_activity_offering')
.select(`
  id,
  name,
  trac_activity_id,
  booking_open_at,
  booking_close_at,
  cost,
  payment_due_at,
  allow_waitlist,
  event_id,
  organisation_id,
  trac_activity:trac_activity (
    id,
    name,
    event_id
  )
`)
.eq('id', offeringId)
.single()
```

**Sessions for offering**

```
from('base_activity_session')
.select(`
  id,
  offering_id,
  session_name,
  start_time,
  end_time,
  location_display_name,
  capacity,
  created_at,
  updated_at
`)
.eq('offering_id', offeringId)
.order('start_time', { ascending: true })
```

**TRAC activities for selector**

```
from('trac_activity')
.select(`
  id,
  name,
  event_id
`)
.eq('event_id', selectedEvent.id)
.order('name', { ascending: true })
```

**Booking count for session (delete pre-check)**

```
from('base_activity_booking')
.select('id', { count: 'exact', head: true })
.eq('session_id', sessionId)
```

_If `base_activity_booking` is absent from dev-db at build time, this query will fail. Wrap in a try/catch and default to count = 0 with a console warning. Remove the fallback once the table is migrated._

### 7.2 Write contracts

All mutation handlers must check `useSecureSupabase()` before executing. If the client is `null`, abort the mutation, do not show an error toast, and allow the null-client loading state (§3) to resolve naturally. Never call a write operation against a null client.

**Create offering**

```
// Resolve organisation_id from event context (BR-ORG-RESOLVE)
from('base_activity_offering').insert({
  name:              string,              // non-empty, trimmed
  event_id:          selectedEvent.id,
  organisation_id:   uuid,               // resolved from event context
  trac_activity_id:  uuid | null,
  booking_open_at:   string | null,      // ISO timestamptz or null
  booking_close_at:  string | null,      // ISO timestamptz or null
  cost:              number | null,
  payment_due_at:    string | null,      // ISO timestamptz or null
  allow_waitlist:    boolean,            // NOT NULL DEFAULT false; set from toggle
  created_by:        auth.uid(),
  updated_by:        auth.uid(),
})
```

**Update offering** — partial update of `name`, `trac_activity_id`, `booking_open_at`, `booking_close_at`, `cost`, `payment_due_at`, `allow_waitlist`; always set `updated_by: auth.uid()`. `.eq('id', offeringId).select('id').single()`. If the response contains no row (offering was deleted concurrently), surface the error via `normalizeSupabaseError` with the toast "Offering could not be saved — it may have been deleted." and close the dialog.

**Delete offering** — `delete().eq('id', offeringId)` on `base_activity_offering`. Guard: session count must be 0 before calling (BR-DEL-OFFERING).

**Create session**

```
from('base_activity_session').insert({
  offering_id:            offeringId,
  session_name:           string | null,       // optional, trimmed; null if blank
  start_time:             string,              // ISO timestamptz — required
  end_time:               string,              // ISO timestamptz — required; > start_time
  location_display_name:  string | null,       // optional, trimmed; null if blank
  capacity:               number,              // positive integer — required
  created_by:             auth.uid(),
  updated_by:             auth.uid(),
})
```

**Update session** — partial update of `session_name`, `start_time`, `end_time`, `location_display_name`, `capacity`; always set `updated_by: auth.uid()`. `.eq('id', sessionId).select('id').single()`. If the response contains no row (session was deleted concurrently), surface via `normalizeSupabaseError` with toast "Session could not be saved — it may have been deleted." and close the dialog.

**Delete session** — `delete().eq('id', sessionId)` on `base_activity_session`. Perform booking count check first (BR-DEL-SESSION).

### 7.3 RLS / permission contracts

The following RBAC-checked RLS policies are the contracted write path (Kusi Q-1 resolution 2026-05-11). These policies do not yet exist in dev-db — they are a §14 migration prerequisite.

```sql
-- base_activity_offering (confirmed live in dev-db rkytnffgmwnnmewevqgp — RLS migration required)
-- SELECT:
check_rbac_permission_with_context(
  'read:page.activities', 'activities',
  organisation_id, event_id::text, get_app_id('BASE')
)
-- INSERT (authenticated):
check_rbac_permission_with_context(
  'create:page.activities', 'activities',
  organisation_id, event_id::text, get_app_id('BASE')
)
-- UPDATE:
check_rbac_permission_with_context(
  'update:page.activities', 'activities',
  organisation_id, event_id::text, get_app_id('BASE')
)
-- DELETE:
check_rbac_permission_with_context(
  'delete:page.activities', 'activities',
  organisation_id, event_id::text, get_app_id('BASE')
)
-- service_role: ALL (true)

-- base_activity_session — same RBAC-checked RLS pattern as base_activity_offering.
-- base_activity_session does NOT carry its own organisation_id column.
-- The RLS helper receives organisation_id via a subselect:
--   (SELECT organisation_id FROM base_activity_offering WHERE id = base_activity_session.offering_id)
-- Example SELECT policy:
--   check_rbac_permission_with_context(
--     'read:page.activities', 'activities',
--     (SELECT organisation_id FROM base_activity_offering WHERE id = base_activity_session.offering_id),
--     (SELECT event_id FROM base_activity_offering WHERE id = base_activity_session.offering_id)::text,
--     get_app_id('BASE')
--   )
-- Apply the same subselect pattern for INSERT ('create:page.activities'),
-- UPDATE ('update:page.activities'), and DELETE ('delete:page.activities').
-- service_role: ALL (true)
```

### 7.4 Cross-slice hand-offs

| Flow | Detail |
|------|--------|
| Provides | **BA09.contract** — `base_activity_offering` and `base_activity_session` records consumed by BA08 (unit preferences available sessions list), BA10 (participant booking), BA11 (booking oversight) |
| Reads | `trac_activity` records from TRAC — read-only, no writes from BASE |
| Downstream | BA10, BA11, BA12–BA16 depend on `base_activity_offering` and `base_activity_session` records created by this slice |

### 7.5 ID contracts

UUIDs as strings throughout. The `:offeringId` path segment is the `base_activity_offering.id` UUID. Do not expose raw UUIDs in prominent user-visible copy.

---

## 8. Data and schema references

| Artefact | Role |
|----------|------|
| **`base_activity_offering`** | Offering CRUD root — confirmed live in dev-db `rkytnffgmwnnmewevqgp` |
| **`base_activity_session`** | Session CRUD — confirmed live in dev-db `rkytnffgmwnnmewevqgp` |
| **`trac_activity`** | Read-only TRAC activity source for offering linkage selector — confirmed in dev-db |
| **`base_activity_booking`** | Read-only for session delete booking count check — forward spec, not yet in dev-db |
| **`core_events`** | `organisation_id` resolution for offering inserts |

**DB constraints (forward spec — RLS and CHECK constraints; migration required):**

| Constraint | Table | Type | Rule |
|------------|-------|------|------|
| `base_activity_session_time_order` | `base_activity_session` | CHECK | `start_time < end_time` |
| `base_activity_session_capacity_positive` | `base_activity_session` | CHECK | `capacity > 0` |
| `base_activity_offering_booking_window_order` | `base_activity_offering` | CHECK | `booking_close_at >= booking_open_at` |
| `base_activity_offering_trac_event_context_guard` | `base_activity_offering` | TRIGGER | calls `base_activity_offering_enforce_trac_event_context()` |

**MCP / dev-db verification status (project `rkytnffgmwnnmewevqgp`):**

1. ✅ `base_activity_offering` — confirmed live in dev-db `rkytnffgmwnnmewevqgp`. Includes `allow_waitlist boolean NOT NULL DEFAULT false`. RLS and CHECK constraints still require migration.
2. ✅ `base_activity_session` — confirmed live in dev-db `rkytnffgmwnnmewevqgp`. Live columns include `session_name text NULLABLE` and `location_display_name text NULLABLE`. RLS and CHECK constraints still require migration.
3. ❌ `base_activity_booking` — **NOT in dev-db**. Session delete booking-count check is forward spec; build-time conditional applies (see §7.1).
4. ✅ `trac_activity` — confirmed in dev-db with all columns used by BA09 (`id`, `name`, `event_id`, `organisation_id`).
5. ✅ `check_rbac_permission_with_context` — confirmed live RPC.
6. ✅ `get_app_id` — confirmed live RPC.

---

## 9. pace-core2 imports

### §9.1 Imports table

| Symbol | Import path | One-line why |
|--------|-------------|--------------|
| `PagePermissionGuard`, `AccessDenied` | `@solvera/pace-core/rbac` | Route gates for both surfaces |
| `useSecureSupabase` | `@solvera/pace-core/rbac` | RLS-aware Supabase client for all data operations |
| `useUnifiedAuth` | `@solvera/pace-core/hooks` | User ID (`auth.uid()`) and scope resolution |
| `useEvents` | `@solvera/pace-core/hooks` | `selectedEvent` — supplies `selectedEvent.id` for all queries |
| `DataTable` | `@solvera/pace-core/components` | Offerings list and sessions list tables |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` | `@solvera/pace-core/components` | Offering summary section container |
| `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogBody`, `DialogFooter`, `DialogClose` | `@solvera/pace-core/components` | All create/edit/delete confirmation flows |
| `Button` | `@solvera/pace-core/components` | Actions throughout — Create offering, Add session, Back, Edit, Delete |
| `Input` | `@solvera/pace-core/components` | Name, Cost, Capacity, Location form fields |
| `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` | `@solvera/pace-core/components` | TRAC activity selector in offering form |
| `Alert`, `AlertTitle`, `AlertDescription` | `@solvera/pace-core/components` | Error states, empty states, delete warnings |
| `Badge` | `@solvera/pace-core/components` | Session count, capacity, and booking status chips |
| `Checkbox` | `@solvera/pace-core/components` | Acknowledgement control in delete-session dialog when bookings exist |
| `LoadingSpinner` | `@solvera/pace-core/components` | Loading fallbacks on `/activities/:offeringId` |
| `DateTimeField` | `@solvera/pace-core/components` | All `timestamptz` date+time inputs (`start_time`, `end_time`, `booking_open_at`, `booking_close_at`, `payment_due_at`) |
| `Form`, `FormField` | `@solvera/pace-core/components` | Create/edit forms for offerings and sessions |
| `SaveActions` | `@solvera/pace-core/components` | Dialog footer Cancel + Save controls |
| `useToast` | `@solvera/pace-core/hooks` | Mutation success/failure toasts (or `toast` module-level call) |
| `normalizeSupabaseError`, `formatDateTime` | `@solvera/pace-core/utils` | Error formatting and date display |

### §9.2 Slice-specific caveats

**`DataTable` — built-in creation and editing disabled**

Both the offerings `DataTable` (on `/activities`) and the sessions `DataTable` (on `/activities/:offeringId`) must have `features.creation = false` and `features.editing = false`. Create and edit actions open controlled `Dialog` components managed by local state — not the `DataTable` built-in dialog. Supply custom row actions via the `actions` prop.

**`DateTimeField` — all `timestamptz` fields**

`DateTimeField` from `@solvera/pace-core/components` is the component for every `timestamptz` input in this slice: session `start_time`, `end_time`, and offering `booking_open_at`, `booking_close_at`, `payment_due_at`. Do not use `DatePickerWithTimezone` — it is date-only. `DateTimeField` combines date and time-of-day in a single timezone-aware control.

**`FormField` with `render` prop**

Use `FormField` with the `render` prop for `DateTimeField`, `Select` (TRAC activity), and numeric `capacity`. The `render` prop receives `{ field, fieldState }` from `react-hook-form` Controller. Wire `field.value` and `field.onChange` into the control.

**`useEvents()` — field name**

`selectedEvent.id` is the canonical event identifier. Do not use `selectedEvent.event_id` — that field does not exist on `EventStub`.

---

## 10. Permission and access rules

| Surface | Permission | Enforcement |
|---------|-----------|-------------|
| View `/activities` | `read:page.activities` (via `pageName="activities"`) | `PagePermissionGuard` + RLS |
| View `/activities/:offeringId` | `read:page.activities` (same pageName) | `PagePermissionGuard` + RLS |
| Create offering | `create:page.activities` | Guard wrapper on Create button + RLS (migration required) |
| Edit offering | `update:page.activities` | Guard wrapper on Edit button + RLS (migration required) |
| Delete offering | `delete:page.activities` | Guard wrapper on Delete action + RLS (migration required) |
| Add session | `create:page.activities` | Guard wrapper on Add Session button + RLS (migration required) |
| Edit session | `update:page.activities` | Guard wrapper on Edit row action + RLS (migration required) |
| Delete session | `delete:page.activities` | Guard wrapper on Delete row action + RLS (migration required) |

---

## 11. Acceptance criteria

### `/activities` route

- Given an authenticated user with `read:page.activities` and an event selected with no offerings, the offerings `DataTable` shows "No activity offerings have been created for this event."
- Given an authenticated user with `read:page.activities` and an event with offerings, the `DataTable` shows rows ordered by name ascending with columns: Name, Sessions, Booking Opens, Booking Closes, Cost, TRAC Activity.
- Given no event is selected, the page shows the "No event selected" `Card`; the `DataTable` does not render.
- Given a user without `read:page.activities`, `AccessDenied` renders and the offerings list does not appear.
- Given creating an offering with a blank name, the form shows "Offering name is required."
- Given creating an offering with `booking_close_at` earlier than `booking_open_at`, the form shows "Booking close time must be on or after booking open time."
- Given creating a valid offering, the offering appears in the list and a "Offering created" toast appears.
- Given pressing Delete on an offering that has sessions, the Delete button in the confirmation dialog is disabled and the "All sessions must be removed" message is shown.
- Given pressing Delete on an offering with no sessions and confirming, the offering is removed and an "Offering deleted" toast appears.
- Given a user without `create:page.activities`, the "Create offering" button is not visible.

### `/activities/:offeringId` route

- Given navigating to a valid offering, the page renders the offering name as `h1`, the offering summary `Card`, and the sessions `DataTable`.
- Given navigating to an invalid `offeringId`, an `Alert` `variant="destructive"` is shown with a "Back to offerings" link.
- Given zero sessions for the offering, the sessions `DataTable` shows "No sessions have been added to this offering yet."
- Given adding a session with `end_time` equal to or before `start_time`, the form shows "End time must be after start time."
- Given adding a session with `capacity` of 0, the form shows "Capacity must be a positive whole number."
- Given adding a valid session, the session appears in the sessions list and an "Session added" toast appears.
- Given editing an offering and saving, the offering summary `Card` reflects the updated values and an "Offering saved" toast appears.
- Given editing a session and saving, the sessions `DataTable` reflects the updated session and a "Session saved" toast appears.
- Given pressing Delete on a session with no bookings and confirming, the session is removed and a "Session deleted" toast appears.
- Given pressing Delete on a session with bookings, the delete confirmation shows the booking count warning and the Delete button is disabled until the acknowledgement checkbox is checked.
- Given a user without `update:page.activities`, the Edit offering button and Edit session row actions are not visible.
- Given a user without `create:page.activities`, the "Add session" button is not visible.

---

## 12. Verification

1. **App (`/activities`):** Open with seeded event (BA18) — offerings load, ordered by name. Verify session count badges and booking status badges on each row.
2. **App (`/activities`):** Create an offering with all optional fields populated. Verify it appears in the list. Edit the offering and change the name. Verify the updated name appears.
3. **App (`/activities`):** Attempt to delete an offering that has sessions — verify Delete is disabled with the sessions-exist copy. Remove all sessions, then delete the offering.
4. **App (`/activities/:offeringId`):** Navigate to an offering. Add a session with all fields. Verify it appears in the sessions `DataTable` ordered by `start_time`.
5. **App (`/activities/:offeringId`):** Edit a session — change the start time and capacity. Verify the `DataTable` row updates.
6. **App (`/activities/:offeringId`):** Attempt to create a session with `end_time` before `start_time` — verify the BR-SO validation error. Attempt with `capacity = 0` — verify BR-CAP error.
7. **App (`/activities/:offeringId`):** Delete a session with no bookings — verify single confirmation step. (Session with bookings test deferred until `base_activity_booking` is in dev-db.)
8. **App:** Verify `AccessDenied` renders for a user without `read:page.activities`.
9. **App:** Verify "No event selected" `Card` renders on both routes when no event is chosen.
10. **MCP (post-migration):** Confirm `base_activity_offering` schema including `name`, `trac_activity_id`, `booking_open_at`, `booking_close_at`, `cost`, `payment_due_at`, `allow_waitlist` columns and CHECK constraint `base_activity_offering_booking_window_order`.
11. **MCP (post-migration):** Confirm `base_activity_session` schema including `session_name`, `start_time`, `end_time`, `capacity`, `location_display_name` columns and CHECK constraints `base_activity_session_time_order` and `base_activity_session_capacity_positive`.
12. **MCP (post-migration):** Confirm RBAC-checked RLS policies on both tables using `check_rbac_permission_with_context` with `get_app_id('BASE')`.

---

## 13. Testing requirements

**Automated minimum**

- BR-NAME-REQUIRED: unit tests for non-empty, blank, whitespace-only, and whitespace-padded offering names.
- BR-SO: unit tests for equal timestamps, end before start, end after start, and same-minute edge case.
- BR-CAP: unit tests for positive integer, zero, negative, and float inputs.
- BR-BW: unit tests for close before open, close equal to open, close after open, and null-field pairs (rule must not fire when either field is null).
- BR-DEL-OFFERING: integration test confirming the Delete button is disabled when a session exists for the offering.
- BR-TRAC: unit test confirming the TRAC selector query filters by `event_id = selectedEvent.id`.
- Permission guard renders `AccessDenied` when `usePageCan` mock denies read.
- Guard-before-empty-state: mock guard deny + no event; confirm `AccessDenied` renders, not the no-event `Card`.

**Concurrency:** n/a — standard PDLC quality gates apply.

---

## 14. Build execution rules

- **Stop** if the RBAC-checked RLS policies have not been applied to `base_activity_offering` and `base_activity_session` (both tables are confirmed live in dev-db `rkytnffgmwnnmewevqgp`; the RLS policies and CHECK constraints are the remaining migration prerequisite).
- **Stop** if the RBAC-checked RLS policies (INSERT/UPDATE/DELETE using `check_rbac_permission_with_context`) have not been applied to `base_activity_offering` and `base_activity_session`. Read-only queries may proceed since both tables are confirmed live, but no write UI should ship without the write policies in place.
- **Do not** use `DatePickerWithTimezone` for any field in this slice — use `DateTimeField` for all `timestamptz` inputs.
- **Do not** enable `features.creation` or `features.editing` on either `DataTable` — custom `Dialog` forms handle create and edit.
- **Always** use `selectedEvent.id` from `useEvents()` — not `selectedEvent.event_id`.
- **Never** use `window.confirm()` — all confirmations use pace-core `Dialog`.
- **Conditional:** if `base_activity_booking` is absent from dev-db when implementing the session delete flow, default the booking count check to 0 with a `console.warn`. Remove the fallback once `base_activity_booking` is migrated.
- Scope is `/activities` and `/activities/:offeringId` only. Do not absorb portal booking, BA10, BA11, or scanning routes.

---

## 15. Done criteria

- All §4 and §5 behaviours observable in preview environment with screenshots: loading, empty, error, create/edit/delete offering, add/edit/delete session, TRAC linkage, permission-denied state.
- RLS policy migration and DB CHECK constraints for `base_activity_offering` and `base_activity_session` (both tables confirmed live in dev-db `rkytnffgmwnnmewevqgp`) deployed and MCP-verified.
- §12 verification flows completed; results noted in build queue evidence.
- QA pack executed; quality gates green.

---

## 16. Do not

- Do not use `window.confirm()` anywhere — all confirmations use pace-core `Dialog`.
- Do not use `selectedEvent.event_id` — use `selectedEvent.id`.
- Do not use `DatePickerWithTimezone` — use `DateTimeField` for all `timestamptz` inputs.
- Do not enable `DataTable` built-in creation or editing — use controlled `Dialog` forms with custom row actions.
- Do not write to `trac_activity` from BASE — TRAC linkage is read and referenced only.
- Do not implement participant booking, booking state management, or waitlist logic — those belong to BA10 and BA11.
- Do not implement scanning setup, runtime, or session tracking — those belong to BA12–BA16.
- Do not show booking-window status as "open" when both `booking_open_at` and `booking_close_at` are null — default to "Booking closed" badge.
- Do not allow deletion of an offering that has sessions — the Delete button must be disabled with explanatory copy until sessions are removed (BR-DEL-OFFERING).
- Do not reference `../../database/domains/base.md` — that file does not exist. Schema authority is the v5 slice and platform-snapshot-2026-05-11.
- Do not use the `/location` barrel from pace-core — the session location field is a plain text input and requires no address-resolution utilities.
- Do not absorb unit preference submission, preference ranking, or booking oversight into this slice.

---

## 17. References

- `docs/requirements/BASE-architecture.md` — §6 Activity Offering and Session Setup; route ownership; cross-slice hand-offs.
- `docs/requirements/BASE-project-brief.md` — delivery framing and BASE scope.
- `docs/requirements/BA08-units-and-group-coordination-requirements.md` — consumes `base_activity_session` records for unit-preference available sessions list.
- `docs/requirements/BA10-participant-booking-experience-requirements.md` — participant booking against offerings and sessions.
- `docs/requirements/BA11-booking-operations-oversight-requirements.md` — booking oversight consuming BA09 offering/session contracts.
- `docs/requirements/BA18-base-dev-seed-data-requirements.md` — seed data for non-empty offering/session verification.
