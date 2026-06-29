# BA08 — Units and Group Coordination

## Slice metadata

- Status: Draft
- Depends on: BA06 (approved applications pool for role assignment)
- Backend impact: Read + write contracts; `app_base_unit_preference_submit(p_unit_id, p_event_id)` is part of the BA08 submit contract
- Frontend impact: UI

---

## 2. Overview

BA08 gives event organisers the tools to define the unit structure for an event, assign coordinators and roles to those units, and — once activity sessions are available — capture and submit ranked activity preferences on behalf of each unit. The slice owns two routes: `/units`, which presents a three-tab admin surface for unit hierarchy, role type management, and role assignment; and `/unit-preferences`, where a unit coordinator selects a unit and builds a ranked list of preferred activity sessions, then submits the set as a locked preference record. Reads run through RLS-scoped Supabase clients; all write operations use approved table or RPC contracts. This slice does not touch participant activity bookings — that is BA10 territory in pace-portal.

---

## 3. What this slice delivers

### Purpose

Event organisers need to structure participants into named units (groups), define what roles exist within those units, and assign approved applicants to those roles. Unit coordinators additionally need a dedicated surface to indicate which activity sessions their unit would prefer to participate in, ranked by priority, before the allocation process runs. This slice delivers both workflows in a single organiser-facing bounded context.

### Surfaces

- **`/units` (prototype authority):** KPI row, unit assignment card grid, inline **New unit** form — see §5 Prototype layout summary.
- **`/units` (production extension, pass 2+):** three-tab DataTable surface (Units | Role Types | Role Assignment) — see §5 Production extension — `/units` below; not shown in prototype.
- **`/unit-preferences`** — gated page where a coordinator selects a unit, builds a ranked preference list against available activity sessions (from BA09's `base_activity_session` records), validates the ranking, and submits it as a locked set.

### Boundaries

- This slice does not own participant activity bookings (`base_activity_booking`) — those belong to BA10 in pace-portal.
- This slice does not own activity offering or session creation — that is BA09.
- This slice does not own the `rbac_user_units` table at the UI level — that table is managed outside this slice. It is referenced only through the RLS mechanism on `base_activity_preference` (see §10).
- This slice does not implement reopen or reset of a submitted preference set — that is explicitly excluded from MVP.
- This slice does not merge preference submission into booking allocation; preferences are inputs to an allocation process, not confirmed bookings.
- This slice does not own application creation or status management — that is BA05a and BA06.
- Preference reopen/reset is not planned for MVP; the slice is silent on the capability (no "Do not implement" hint in UI copy).

### Architectural posture

- All reads and mutations use **`useSecureSupabase()`** from `@solvera/pace-core/rbac`; no service-role client in route code.
- Unit and role type mutations use direct Supabase table writes. `organisation_id` must be explicitly resolved from `core_events.organisation_id` before inserts into `base_units` and `base_unit_role_types` — it is not set by any trigger on those tables.
- `base_unit_roles` inserts and updates omit `event_id` and `organisation_id` — the `sync_base_unit_roles_event_org_trigger` fills both automatically.
- Preference submission uses **`app_base_unit_preference_submit(p_unit_id, p_event_id)`** only. No direct `submitted_at` update on `base_activity_preference` rows from the client.
- Draft preference rows (CRUD of individual `base_activity_preference` rows) use direct Supabase table writes while `submitted_at IS NULL`.
- > **Route read access:** Enforced by the app authenticated shell / PaceAppLayout `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). The page component must not wrap content in an outer `PagePermissionGuard operation="read"` unless this slice explicitly requires a **scoped read** override (`scope={{ organisationId, eventId, appId }}`).
- Mutation affordances use `PagePermissionGuard` with `create` / `update` / `delete` as applicable per §10.
- Event context is resolved via **`useEvents()`** — use `selectedEvent.id` as the `event_id` at all data boundaries.

### Page-level guards and evaluation ordering

**Both routes — `/units` and `/unit-preferences`**

1. > **Route read access:** Enforced by the app authenticated shell / PaceAppLayout `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). The page component must not wrap content in an outer `PagePermissionGuard operation="read"` unless this slice explicitly requires a **scoped read** override (`scope={{ organisationId, eventId, appId }}`).

2. **Route read access** is enforced by the authenticated shell / `PaceAppLayout` `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). If access is denied, **`AccessDenied`** is shown; no-event messaging does not replace denial.
3. If the guard is loading and no custom `loading` prop is supplied, **`PagePermissionGuard`** renders `null` — neither children nor the denial state.
4. If the guard permits and **no event is selected** (`selectedEvent.id` falsy), the page shows a blocking **`Card`** instructing the user to choose an event in the shell. Data fetches do not run.
5. If the guard permits and **an event is selected**, data loads for that `event_id`.

**Scope object when required context is absent**

Pass `organisationId` and `eventId` from **`useUnifiedAuth()`** / **`Scope`** (`@solvera/pace-core/rbac`). When no event is selected, `eventId` is `null` or `undefined` — never a sentinel string.

**Null Supabase client**

If **`useSecureSupabase()`** returns `null` (transient auth client initialisation), render a centred **`LoadingSpinner`** in the main content region. Do not show an error; the client resolves automatically once auth state settles.

---

## 4. Functional specification

Prefix legend: **`UP`** /units page-level, **`UT`** Units tab, **`RTT`** Role Types tab, **`RAT`** Role Assignment tab, **`PP`** /unit-preferences page-level, **`PD`** Preferences draft state, **`PS`** Preferences submitted state.

### `/units` — page entry / surface entry

1. **UP-PE-01 —** Navigating to `/units` renders inside the BA00 authenticated shell; the URL has no mandatory query keys.
2. **UP-PE-02 —** With an event selected, the page loads units, role types, and (on the Role Assignment tab) applications for the selected event, where all queries use `selectedEvent.id` as the `event_id` filter.
3. **UP-PE-03 —** Page chrome: `h1` "Units" and a subtitle that names the selected event and describes the purpose of the surface.
4. **UP-PE-04 —** The page renders three tabs: **Units**, **Role Types**, and **Role Assignment** (in that order).

### `/units` — loading states

5. **UP-LS-01 —** While the units query is unresolved and the guard permits with an event selected, the Units tab **`DataTable`** receives `isLoading` true (table shows built-in loading row with **`LoadingSpinner`** per pace-core **`DataTable`** behaviour).
6. **UP-LS-02 —** The Role Types and Role Assignment tabs show the same loading treatment for their own data fetches.

### `/units` — empty states

7. **UP-ES-01 —** Event selected, zero units: the Units tab **`DataTable`** shows its empty state with copy "No units have been created for this event."
8. **UP-ES-02 —** Event selected, zero role types: the Role Types tab **`DataTable`** shows its empty state with copy "No role types have been defined for this event."
9. **UP-ES-03 —** No event selected: the page shows a blocking **`Card`** with copy "Select an event from the header to manage its units." Tab content does not render; fetches do not run.

### `/units` — error states

10. **UP-ER-01 —** Units list fetch failure: **`Alert`** `variant="destructive"` inside the Units tab with the normalised error message and a **Retry** control that refetches the units query.
11. **UP-ER-02 —** Same treatment for role types fetch failure (Role Types tab) and applications fetch failure (Role Assignment tab).

---

### Units tab — primary content

12. **UT-PC-01 —** The Units tab hosts a **`DataTable`** in a **`Card`** with title "Units" and a description line showing the unit count and selected event name.
13. **UT-PC-02 —** Columns (in order): **Unit #** (integer, sortable), **Unit Name** (text, sortable), **Subcamp** (text, sortable), **Contingent** (text, sortable), **Parent Unit** (formatted as `unit_number – unit_name` when a parent exists, or "—" when none; sortable).
14. **UT-PC-03 —** Parent Unit display rule: if `parent_unit` is present, format as `{parent.unit_number} – {parent.unit_name}` when `unit_name` is non-null; otherwise show `{parent.unit_number}` alone.
15. **UT-PC-04 —** Rows are ordered by `unit_number` ascending on initial load.

### Units tab — primary actions (create)

16. **UT-PA-01 —** The DataTable **`onCreateRow`** callback opens the built-in creation flow. Fields: **Unit #** (required), **Unit Name** (optional), **Subcamp** (optional), **Contingent** (optional), **Parent Unit** (optional select — on create, all existing units for the event are valid parent choices; the circular-reference exclusion rule applies on edit, not create; see BR-ANTI-CIRCULAR-UI).
17. **UT-PA-02 —** On submit, resolve `organisation_id` from `core_events.organisation_id` for the event (BR-ORG-RESOLVE), then insert the row into `base_units`. Success: toast "Unit created", list refreshed. Failure: toast with error message; form stays open.
18. **UT-PA-03 —** Validation rules applied on create: BR-UNIT-NUMBER, BR-OPTIONAL-FIELDS.

### Units tab — primary actions (edit)

19. **UT-PA-04 —** The DataTable **`onEditRow`** callback opens the built-in edit flow. All fields are editable. Parent Unit options exclude the unit being edited and all its descendants (BR-ANTI-CIRCULAR-UI).
20. **UT-PA-05 —** On submit, update the row in `base_units`. Success: toast "Unit updated", list refreshed. Failure: toast with error message.
21. **UT-PA-06 —** If the database trigger `check_circular_unit_reference_trigger` rejects the update, surface the error as a toast. The UI-level filtering (BR-ANTI-CIRCULAR-UI) is the user experience guard; the trigger is the database-level safety gate.

### Units tab — primary actions (delete)

22. **UT-PA-07 —** The DataTable **`onDeleteRow`** callback triggers a **`ConfirmationDialog`** (via pace-core Dialog, **not** `window.confirm`). Title: "Delete unit". Description: "This will permanently delete unit {unit_number}{unit_name}. Any child units and all role assignments for this unit will also be deleted." Confirm label: "Delete". Variant: `destructive`.
23. **UT-PA-08 —** On confirm, delete the row from `base_units`. Success: toast "Unit deleted", list refreshed. Failure: toast with error message; dialog stays open.

### Units tab — secondary actions (import)

24. **UT-SA-01 —** The DataTable `onImport` handler accepts CSV or Excel files. Required column header: **`unit_number`** (integer ≥ 1). Optional column headers: **`unit_name`** (text), **`subcamp`** (text), **`contingent`** (text), **`parent_unit_number`** (integer — matched against existing units' `unit_number` for the event to resolve `parent_unit_id`). Column headers are case-insensitive. Unrecognised columns are ignored. On import: validate each row against BR-UNIT-NUMBER; resolve parent unit by matching `parent_unit_number` to existing units when that column is present; apply BR-OPTIONAL-FIELDS to `unit_name`, `subcamp`, `contingent`; insert valid rows in sequence; report a summary toast showing how many rows were imported and how many failed (with reasons).
25. **UT-SA-02 —** Rows that fail validation are skipped; valid rows continue. Import does not roll back on partial failure.

### Units tab — secondary actions (export, search, grouping)

26. **UT-SA-03 —** The DataTable toolbar shows search (global text filter across all visible columns), export button (CSV), grouping control (group by Subcamp or Contingent), and column visibility toggle.

---

### Role Types tab — primary content

27. **RTT-PC-01 —** The Role Types tab hosts a **`DataTable`** in a **`Card`** with title "Role Types" and a description "Define the roles available for unit assignments in this event."
28. **RTT-PC-02 —** Columns: **Role Title** (text, sortable). Rows ordered alphabetically by `role_title` on initial load.

### Role Types tab — primary actions (create, edit, delete)

29. **RTT-PA-01 —** **`onCreateRow`**: Field is **Role Title** (required). Validation: BR-ROLE-TITLE. On submit, resolve `organisation_id` from `core_events.organisation_id` (BR-ORG-RESOLVE), then insert into `base_unit_role_types`. Success: toast "Role type created", list refreshed. Failure: toast with error.
30. **RTT-PA-02 —** **`onEditRow`**: Same field. On submit, update the row. Success: toast "Role type updated". Failure: toast with error.
31. **RTT-PA-03 —** **`onDeleteRow`**: **`ConfirmationDialog`**. Title: "Delete role type". Description: "This will permanently delete the role type "{role_title}". Any role assignments using this type will also be removed." Confirm: "Delete". Variant: `destructive`. On confirm, delete from `base_unit_role_types`. Success: toast "Role type deleted". Failure: toast with error.

---

### Role Assignment tab — primary content

32. **RAT-PC-01 —** The Role Assignment tab renders a **`Card`** with title "Role Assignment" and description "Assign roles to approved applicants within a selected unit."
33. **RAT-PC-02 —** The card body shows a **unit selector** (Select component) with placeholder "Choose a unit". The applicant selector, role type selector, Assign button, and assignments DataTable only appear once a unit is selected.
34. **RAT-PC-03 —** Once a unit is selected, the assignments **`DataTable`** loads for that unit: columns **Applicant Name** (full name per BR-APPLICANT-NAME, sortable), **Email** (from person, sortable), **Application Status** (badge, sortable), **Assigned Role** (role title or "No role assigned").

### Role Assignment tab — primary actions

35. **RAT-PA-01 —** With a unit selected, two additional selectors appear above the Assign button: **Applicant** (Select — shows approved applications only per BR-APPROVED-POOL) and **Role Type** (Select — shows role types for the event). The **Assign Role** button appears only when all three (unit, applicant, role type) are populated.
36. **RAT-PA-02 —** Pressing **Assign Role** upserts the assignment (BR-ROLE-UPSERT): if a `base_unit_roles` row already exists for the `(unit_id, application_id)` pair, update its `role_type_id`; otherwise insert. Success: toast "Role assigned", reset applicant and role type selectors, refresh assignments. Failure: toast with error.
37. **RAT-PA-03 —** In the Assigned Role column of the assignments DataTable, a **Remove** button appears inline for rows with an existing assignment. Clicking Remove shows a **`ConfirmationDialog`**: Title "Remove role assignment", Description "Remove the role assignment for {applicant_name}?", Confirm label "Remove", Variant `destructive`. On confirm, delete the row from `base_unit_roles`. Success: toast "Role assignment removed", refresh. Failure: toast with error.

---

### `/unit-preferences` — page entry / surface entry

38. **PP-PE-01 —** Navigating to `/unit-preferences` renders inside the BA00 authenticated shell.
39. **PP-PE-02 —** With an event selected, the page loads units for the event (for the unit selector). No preference data is loaded until a unit is selected.
40. **PP-PE-03 —** Page chrome: `h1` "Unit Preferences" and a subtitle "Submit ranked activity preferences on behalf of a unit."
41. **PP-PE-04 —** A **unit selector** (Select component) with placeholder "Choose a unit" is shown at the top of the page content. The preference management section renders only after a unit is selected.

### `/unit-preferences` — loading states

42. **PP-LS-01 —** While units load (after event selection), the unit selector is disabled with a loading state.
43. **PP-LS-02 —** After a unit is selected, while preference rows and sessions load simultaneously, a `LoadingSpinner` replaces the preference content region until both are resolved.

### `/unit-preferences` — empty states

44. **PP-ES-01 —** No event selected: blocking `Card` with copy "Select an event from the header to manage unit preferences." Fetches do not run.
45. **PP-ES-02 —** Event selected, no units exist: unit selector shows empty with copy "No units have been created for this event. Create units in the Units page first."
46. **PP-ES-03 —** Unit selected, no activity sessions exist for the event: informative `Alert` `variant="default"` with copy "No activity sessions have been set up for this event yet. Sessions are created in the Activities section." The preference form does not render.

### `/unit-preferences` — error states

47. **PP-ER-01 —** Preference rows or sessions fetch failure: `Alert` `variant="destructive"` with normalised error message and Retry control.

### `/unit-preferences` — draft state (`submitted_at IS NULL`)

48. **PD-PC-01 —** The preference section shows two panels side by side (or stacked on mobile): **Available Sessions** and **Preferences for {unit_number}**.
49. **PD-PC-02 —** **Available Sessions** lists all `base_activity_session` rows for the event that have not yet been added to this unit's preferences. Each row shows: session name (or "Session {id short}" if `session_name` is null), start time (formatted per BR-DATETIME), and an **Add** button.
50. **PD-PC-03 —** Pressing **Add** on a session inserts a new `base_activity_preference` row for the `(unit_id, session_id)` pair with `rank` auto-assigned as `current_max_rank + 1` (or `1` if none exist). The session moves from Available Sessions to the Preferences list. Success is immediate (optimistic) with rollback on error.
51. **PD-PC-04 —** **Preferences** panel lists the unit's current draft preference rows. Each row shows: **Rank** (number input, 1–N), **Session Name**, **Date/Time**, and a **Remove** button.
52. **PD-PC-05 —** The **Rank** input allows the coordinator to type a specific rank value. On blur or change: re-sort the list by the entered rank value; re-number all rows to ensure contiguous integers starting at 1 (BR-RANK-CONTIGUOUS). If two rows have the same rank after an entry, the most recently edited row takes the entered value and all others are renumbered to maintain contiguity.
53. **PD-PC-06 —** Pressing **Remove** on a preference row deletes that `base_activity_preference` row and returns the session to Available Sessions. Remaining rows are immediately renumbered contiguously from 1 (BR-RANK-CONTIGUOUS). No confirmation dialog required for remove (low-cost reversible action — session returns to Available).
54. **PD-PC-07 —** A **Submit Preferences** button appears below the Preferences list when at least one preference row exists and the current rank set is valid (BR-RANK-VALID). If the rank set is invalid (e.g., gaps detected), the button is disabled and a compact inline validation message explains the issue.
55. **PD-PC-08 —** Pressing **Submit Preferences** opens a **`ConfirmationDialog`**: Title "Submit preferences", Description "Once submitted, preferences for {unit_number} cannot be edited. Confirm you have finalised the ranked list before submitting." Confirm label "Submit", Variant `default`. On confirm, call **`app_base_unit_preference_submit(p_unit_id, p_event_id)`**. Success: toast "Preferences submitted", preference section transitions to submitted state. Failure: toast with error; confirmation dialog remains open.

### `/unit-preferences` — submitted state (`submitted_at IS NOT NULL`)

56. **PS-PC-01 —** When a unit's preferences are submitted, the preference section shows a read-only panel: an `Alert` `variant="default"` stating "Preferences submitted on {formatted submitted_at} by {submitter display name}." (see BR-SUBMITTER-DISPLAY for display name resolution) and a ranked list of sessions (rank, session name, date/time). No edit, add, remove, or submit controls are shown.
57. **PS-PC-02 —** The Available Sessions panel is not shown in submitted state.

---

## 5. Visual specification

- Prototype reference: `pace-prototype/apps/pace-base/pages/UnitsActivitiesScanPage.jsx` (`UnitsPage`).

### Prototype layout summary

1. **PageHeader** — title "Unit assignments"; primary "New unit" (hidden while add form open).
2. **KPI row** — Units (with leaders count), Combined capacity, Assigned (% filled), Unassigned applicants (warm).
3. **Unit grid** — cards with name, leader line, capacity progress bar (tone at 80%/100%), unit id, "Open unit" action.
4. **Inline AddUnitForm** — swaps grid for `Card` + `Form` (name, leader optional, capacity) + `SaveActions` (prefer inline over dialog per prototype house style).
5. **Empty state** — "No units yet" with Add unit action.

### Route map

| Prototype | BASE |
|---|---|
| `#/events/:code/units` | `/units` |

### Implementation delta (pass 2)

- §Layout below may specify DataTable — prototype uses **card grid** with capacity bars; align pass 2 to prototype.

### Production extension — `/units` (not in prototype)

- **`main`** uses Standard 07 page padding (baseline `px-6 py-8` unless the consuming app standard overrides).
- **Heading block:** `h1` "Units", `p` subtitle with event name.
- **Tabs:** full-width pace-core `Tabs` component directly below the heading block; no sidebar. Three tabs: **Units** | **Role Types** | **Role Assignment**.
- Each tab content is a full-width `Card` containing a `DataTable` (Units and Role Types tabs) or a compound Card (Role Assignment tab).
- **Modal dialogs:** centred `Dialog` for confirmations. No drawers.
- **Mobile / responsive:** defers to pace-core `DataTable` defaults (horizontal scroll on narrow viewports). Tabs stack their content vertically. Role Assignment grid (three selectors) collapses to single-column on mobile.

### Components — Units tab

- **`Card`:** header with title "Units" and description showing count + event name.
- **`DataTable`:** toolbar shows search, export button, grouping control (group by Subcamp or Contingent), column visibility picker, create button, import button. Row action column includes inline edit (via `onEditRow`) and delete (via `onDeleteRow`). `initialPageSize={25}`.
- **Columns** (header copy → width hint): Unit # → narrow, Unit Name → medium, Subcamp → medium, Contingent → medium, Parent Unit → medium.
- **Status of empty Parent Unit cell:** render "—" (em dash) not blank.

### Components — Role Types tab

- **`Card`:** header with title "Role Types" and description "Roles available for unit assignments in this event."
- **`DataTable`:** toolbar shows search, create button. Row actions: edit (via `onEditRow`), delete (via `onDeleteRow`). Pagination on. No import, no export. `initialPageSize={25}`.
- **Column:** Role Title → full width.

### Components — Role Assignment tab

- **`Card`:** header with title "Role Assignment" and description.
- **Unit selector row:** `Select` full-width or 1/3-width, label "Unit".
- **Assignment selectors row** (visible once unit selected): three columns — **Applicant** `Select`, **Role Type** `Select`, **Assign Role** `Button`. Collapses to single-column on mobile.
- **Assignments `DataTable`:** columns: Applicant Name → medium, Email → medium, Application Status → narrow (Badge), Assigned Role → medium (role title or italic "No role assigned"). Row action: **Remove** button (only on rows with an assignment). Search, pagination on. No export, no import. `initialPageSize={25}`.
- **Application Status badge variants** (**BR-APP-STATUS**): `approved` → `solid-main-normal`.

### Layout — `/unit-preferences`

- **`main`** with Standard 07 padding.
- **Heading block:** `h1` "Unit Preferences", `p` subtitle.
- **Unit selector:** `Card` containing a `Select` for unit choice, placed immediately below heading.
- **Preference management section** (renders below unit selector once unit chosen): two-column layout on tablet/desktop — **Available Sessions** panel (left/top) and **Preferences** panel (right/bottom). Single-column on mobile.
- **Submitted state:** replaces both panels with a single read-only `Card`.

### Components — Available Sessions panel

- **`Card`:** title "Available Sessions". List of session rows. Each row: session name (bold), date/time (secondary text), **Add** `Button` (`size="sm"`, `variant="outline"`).
- Empty state within panel (all sessions added): "All available sessions have been added to preferences."

### Components — Preferences panel (draft)

- **`Card`:** title "Preferences for {unit_number}". Below the list, the **Submit Preferences** `Button` (`variant="default"`).
- Preference rows in a vertical list: rank input (`Input type="number"`, `min={1}`, narrow fixed width), session name (text), date/time (secondary text), **Remove** `Button` (`size="icon"`, `aria-label="Remove {session_name}"`).
- If the rank set has validation errors (gaps), an inline `p` with error styling below the list explains the issue. Submit button disabled.
- Empty state within panel: "No sessions added yet. Add sessions from the list on the left."

### Components — Preferences panel (submitted read-only)

- **`Card`:** title "Submitted Preferences". `Alert` `variant="default"` at top with submission timestamp and submitter.
- Read-only list: rank number (text, not input), session name, date/time. No buttons.

### States

- **Loading (guard loading):** `null` per `PagePermissionGuard` default; no skeleton visible until client resolves.
- **Loading (Supabase client null):** centred `LoadingSpinner` in main content region.
- **Loading (data fetch):** `DataTable` `isLoading` rows on /units; `LoadingSpinner` on /unit-preferences preference region.
- **No event selected (`/units`):** full-width `Card` directly below the heading block. `CardHeader` with `CardTitle` "No event selected" and `CardDescription` "Select an event from the header to manage its units." No tab content renders; the Tabs component is not shown.
- **No event selected (`/unit-preferences`):** full-width `Card` directly below the heading block (below the unit selector `Card`). `CardHeader` with `CardTitle` "No event selected" and `CardDescription` "Select an event from the header to manage unit preferences." The unit selector `Card` renders in its disabled/empty state; no preference content renders.
- **Empty (/units — data):** per §4 items 7–8 (DataTable empty states within their respective tab cards).
- **Empty (/unit-preferences — data):** per §4 items 45–46.
- **Error:** destructive `Alert` with Retry (per §4 items 10–11, 47).
- **Success mutations:** toasts via `ShowSuccessMessage`.

### Interactions

- **`window.confirm` is not used anywhere in this slice.** All confirmations use pace-core `Dialog` / `ConfirmationDialog`.
- **Dialogs:** Escape and backdrop close; focus trap inside. Confirm dialogs await `onConfirm` before closing; confirm button shows `isPending` disabled state while mutation is in flight.
- **Rank input on /unit-preferences:** on blur, renumber all rows to maintain contiguity (BR-RANK-CONTIGUOUS). No debounce required — persist draft rows immediately on Add/Remove; rank reorder is client-side state until explicitly persisted via individual row updates.
- **Add session (optimistic):** add row immediately in UI; persist in background; rollback on error with error toast.

### Confirmation dialog copy

| Flow | Title | Description | Confirm label | Variant |
|------|-------|-------------|---------------|---------|
| Delete unit | Delete unit | This will permanently delete unit {unit_number}{unit_name}. Any child units and all role assignments for this unit will also be deleted. | Delete | destructive |
| Delete role type | Delete role type | This will permanently delete the role type "{role_title}". Any role assignments using this type will also be removed. | Delete | destructive |
| Remove role assignment | Remove role assignment | Remove the role assignment for {applicant_name}? | Remove | destructive |
| Submit preferences | Submit preferences | Once submitted, preferences for {unit_number} cannot be edited. Confirm you have finalised the ranked list before submitting. | Submit | default |

### Permission matrix (visual)

| Permission context | /units page | Create / edit unit | Delete unit | Role Types CRUD | Assign role | Remove role | Submit preferences |
|---|---|---|---|---|---|---|---|
| No read (units) | `AccessDenied` | hidden | hidden | hidden | hidden | hidden | n/a |
| Read only (units) | tabs visible | hidden | hidden | hidden | hidden | hidden | n/a |
| Read + create/update/delete | full | visible | visible | visible | visible | visible | n/a |
| No read (unit-pref) | `AccessDenied` | n/a | n/a | n/a | n/a | n/a | hidden |
| Read + update (unit-pref) | preference surface | n/a | n/a | n/a | n/a | n/a | visible (until submitted) |

---

## 6. Business rules

### BR-UNIT-NUMBER — Unit number: type and required

**Input:** `unit_number` value from create/edit form or import row.
**Output:** valid positive integer, or validation error.
**Rule:** must be parseable as an integer and be ≥ 1. Non-integer input or value < 1 → error "Unit number must be a positive integer". Empty / blank → error "Unit number is required."
**DB enforcement:** `unit_number` column is `integer NOT NULL` in `base_units`. Application-level validation runs first; DB constraint is the fallback safety gate.

### BR-OPTIONAL-FIELDS — Optional field normalisation

**Inputs:** `unit_name`, `subcamp`, `contingent`.
**Rule:** trim leading and trailing whitespace; if the result is empty after trimming, persist as `null` (not as an empty string).
**Applies on:** create, inline edit, and import.

### BR-ANTI-CIRCULAR-UI — Anti-circular parent reference (UI layer)

**Input:** parent unit `Select` options when editing an existing unit.
**Rule:** the select must exclude the unit being edited and **all of its descendants** (recursively — children, grandchildren, etc.). The excluded set is computed client-side from the loaded units list by recursive traversal starting from the unit being edited.
**Rationale:** prevents a unit from becoming its own ancestor.
**DB safety gate:** `check_circular_unit_reference_trigger` (INSERT + UPDATE on `base_units`) also rejects circular assignments at the database layer. If the trigger fires despite the UI filter, surface the error as a toast: "This assignment would create a circular unit reference."

### BR-ORG-RESOLVE — Organisation ID resolution for inserts

**Applies to:** `base_units` create, `base_unit_role_types` create.
**Rule:** before any insert, fetch `core_events.organisation_id` for the current `event_id`. Use the returned value as the `organisation_id` in the insert payload. If the fetch fails, abort the insert and show an error toast. Do not assume a session-level default will populate this column — no INSERT trigger exists on either table.

### BR-ROLE-TITLE — Role type title: required and trimmed

**Input:** `role_title` field value.
**Rule:** trim whitespace; if empty after trim → error "Role title is required." Must be non-empty after trim.

### BR-APPROVED-POOL — Applicant pool for role assignment

**Input:** applicant selector on Role Assignment tab.
**Rule:** only `base_application` rows with `status = 'approved'` for the selected `event_id` are shown. Applications with any other status (submitted, under_review, pending, rejected, withdrawn) are excluded.
**Rationale:** assigning a unit role to a non-approved applicant has no operational meaning.

### BR-APPLICANT-NAME — Applicant display name

**Input:** `preferred_name`, `first_name`, `last_name` from person row.
**Output:** `trim(COALESCE(preferred_name, first_name) || ' ' || last_name)`. If result is empty after trim, fall back to email; if email is also absent, show "Unknown applicant".

### BR-APP-STATUS — Application status badge on role assignment

| `base_application.status` | Label | `Badge` variant |
|---|---|---|
| `approved` | Approved | `solid-main-normal` |

Only approved applications are shown per BR-APPROVED-POOL; thus only this row is needed in the role assignment context.

### BR-ROLE-UPSERT — Role assignment upsert semantics

**Inputs:** `(unit_id, application_id, role_type_id)` triple.
**Rule:** check whether a `base_unit_roles` row already exists for `(unit_id, application_id)`. If it exists, update its `role_type_id`. If it does not exist, insert a new row. A given applicant has at most one role per unit at any time.

### BR-RANK-CONTIGUOUS — Preference rank contiguity

**Input:** the set of `rank` values for a unit's current draft `base_activity_preference` rows.
**Rule:** the set must form a contiguous sequence `{1, 2, 3, … N}` with no gaps. After any add, remove, or rank edit, re-number all rows client-side to enforce this. Ranks start at 1.

### BR-RANK-VALID — Rank set validity for submit

**Input:** the unit's current draft preference rows before submit.
**Rule:** the set is valid when: (a) at least one row exists, (b) ranks are contiguous from 1 (BR-RANK-CONTIGUOUS), (c) no duplicate `session_id` values exist (enforced by DB UNIQUE constraint; should never occur via UI since sessions move to/from the Available panel).

### BR-DATETIME — Date/time display

**Input:** `start_time` (timestamptz) from `base_activity_session`.
**Output:** formatted using `formatDateTime` (`@solvera/pace-core/utils`). Apply consistently across all session references.

### BR-SUBMIT-LOCK — Preference post-submit immutability

**Rule:** when `submitted_at IS NOT NULL` for any row in a unit's preference set, the entire set for that `(unit_id, event_id)` is read-only. No add, remove, rank edit, or re-submit is possible. The UI presents the submitted state (§4 PS-PC-01). Reopen/reset is not implemented in MVP.

### BR-SUBMITTER-DISPLAY — Submitter display name resolution

**Input:** `submitted_by` UUID from a submitted `base_activity_preference` row.
**Output:** human-readable name string for the submission banner in PS-PC-01.
**Rule:** after loading a submitted preference set, issue a secondary lazy read to `core_person` for the row where `user_id = submitted_by` (see §7.1 submitter read contract). Use the resolved name as: `COALESCE(preferred_name, first_name) || ' ' || last_name` (trimmed). If the lookup returns no row, or if `submitted_by` is null, fall back to the raw UUID. Do not block the submitted read-only view waiting for this lookup — render the banner immediately and fill the name once the secondary query resolves.

### BR-UNIT-ROLES-TRIGGER — Organisation sync for base_unit_roles

**Rule:** the `sync_base_unit_roles_event_org_trigger` (INSERT + UPDATE on `base_unit_roles`) automatically fills `event_id` and `organisation_id`. The client must **not** supply these fields in assign/upsert payloads.

---

## 7. API / Contract

### 7.1 Read contracts (`useSecureSupabase()`)

All queries are scoped to `selectedEvent.id`. If `useSecureSupabase()` returns `null`, gate all queries and show the null-client loading state per §3.

**Units list**

```
from('base_units')
.select(`
  id,
  unit_number,
  unit_name,
  subcamp,
  contingent,
  parent_unit_id,
  event_id,
  created_at,
  updated_at
`)
.eq('event_id', selectedEvent.id)
.order('unit_number', { ascending: true })
```

_Parent unit display names are resolved client-side by joining against the same units list — no second query needed._

**Role types list**

```
from('base_unit_role_types')
.select(`
  id,
  role_title,
  event_id,
  created_at,
  updated_at
`)
.eq('event_id', selectedEvent.id)
.order('role_title', { ascending: true })
```

**Approved applications for role assignment selector**

```
from('base_application')
.select(`
  id,
  status,
  person:core_person (
    preferred_name,
    first_name,
    last_name,
    email
  )
`)
.eq('event_id', selectedEvent.id)
.eq('status', 'approved')
.order('person(last_name)', { ascending: true })
```

_Adjust FK hint names to match PostgREST generated relationship names for the `person_id` foreign key._

**Role assignments for selected unit**

```
from('base_unit_roles')
.select(`
  id,
  unit_id,
  application_id,
  role_type_id,
  role_type:base_unit_role_types (
    id,
    role_title
  ),
  application:base_application (
    id,
    status,
    person:core_person (
      preferred_name,
      first_name,
      last_name,
      email
    )
  )
`)
.eq('unit_id', selectedUnitId)
```

**Role Assignment DataTable compositing (client-side)**

The Role Assignment DataTable is built by merging two queries client-side, not by a single joined query:

1. **Approved applications** — the result of the approved applications query above (all approved `base_application` rows for the event).
2. **Unit role assignments** — the result of the unit role assignments query above (all `base_unit_roles` rows for the selected unit).

Merge on `application_id` (application primary key). For each approved application row, find the matching `base_unit_roles` row (if any) by `application_id`. The composed row exposes:

| Column | Source | When no assignment exists |
|--------|--------|--------------------------|
| Applicant Name | `core_person` via `base_application` | from approved applications list |
| Email | `core_person` via `base_application` | from approved applications list |
| Application Status | `base_application.status` | always "approved" per BR-APPROVED-POOL |
| Assigned Role | `base_unit_role_types.role_title` via `base_unit_roles` | render italic "No role assigned" |

_The Remove button in the row action column appears only on rows where a `base_unit_roles` row was matched (i.e., `role_type_id` is present)._

**Activity sessions for /unit-preferences**

```
from('base_activity_session')
.select(`
  id,
  session_name,
  start_time,
  end_time,
  offering_id,
  capacity
`)
.eq('event_id', selectedEvent.id)
.order('start_time', { ascending: true })
```

**Draft preferences for selected unit**

```
from('base_activity_preference')
.select(`
  id,
  unit_id,
  session_id,
  rank,
  submitted_at,
  submitted_by,
  event_id
`)
.eq('unit_id', selectedUnitId)
.eq('event_id', selectedEvent.id)
.order('rank', { ascending: true })
```

**Submitter display name (lazy, submitted state only)**

Issued only when a preference set has `submitted_at IS NOT NULL`. Triggered after the preference rows load and `submitted_by` is confirmed non-null.

```
from('core_person')
.select(`
  user_id,
  preferred_name,
  first_name,
  last_name
`)
.eq('user_id', submittedByUserId)
.maybeSingle()
```

_`maybeSingle()` is used because `submitted_by` references an auth user who may no longer have a corresponding `core_person` row. If null is returned, fall back to the raw UUID per BR-SUBMITTER-DISPLAY._

### 7.2 Write contracts

**Create unit**

```
// Step 1: resolve organisation_id
const { organisation_id } = await supabase
  .from('core_events')
  .select('organisation_id')
  .eq('event_id', selectedEvent.id)
  .single();

// Step 2: insert
from('base_units').insert({
  unit_number:    number,           // integer ≥ 1
  unit_name:      string | null,    // trimmed, null if blank
  subcamp:        string | null,
  contingent:     string | null,
  parent_unit_id: uuid   | null,
  event_id:       selectedEvent.id,
  organisation_id,                  // from step 1
  created_by:     auth.uid(),
  updated_by:     auth.uid(),
})
```

**Update unit** — partial update of `unit_number`, `unit_name`, `subcamp`, `contingent`, `parent_unit_id`; always set `updated_by: auth.uid()`.

**Delete unit** — `delete().eq('id', unitId)` on `base_units`.

**Create role type**

```
// Step 1: resolve organisation_id (same as create unit)

// Step 2: insert
from('base_unit_role_types').insert({
  role_title:      string,          // non-empty, trimmed
  event_id:        selectedEvent.id,
  organisation_id,                  // from step 1 — required, no trigger fills this
  created_by:      auth.uid(),
  updated_by:      auth.uid(),
})
```

**Update role type** — update `role_title`, `updated_by: auth.uid()`. `.eq('id', roleTypeId)`.

**Delete role type** — `delete().eq('id', roleTypeId)`.

**Assign role (upsert)**

```
// Check existing
const existing = await supabase
  .from('base_unit_roles')
  .select('id')
  .eq('unit_id', unitId)
  .eq('application_id', applicationId)
  .maybeSingle();

if (existing) {
  // Update
  from('base_unit_roles')
    .update({ role_type_id, updated_by: auth.uid() })
    .eq('id', existing.id)
} else {
  // Insert — omit event_id and organisation_id; trigger fills them
  from('base_unit_roles').insert({
    unit_id:        unitId,
    application_id: applicationId,
    role_type_id:   roleTypeId,
    created_by:     auth.uid(),
    updated_by:     auth.uid(),
  })
}
```

**Remove role** — `delete().eq('id', roleId)` on `base_unit_roles`.

**Add preference row (draft)**

```
from('base_activity_preference').insert({
  unit_id:         selectedUnitId,
  session_id:      sessionId,
  rank:            nextRank,       // current_max + 1
  event_id:        selectedEvent.id,
  organisation_id,                  // resolved from core_events
  created_by:      auth.uid(),
  updated_by:      auth.uid(),
})
```

**Update preference rank** — `update({ rank, updated_by: auth.uid() }).eq('id', preferenceId)`.

_Persistence timing:_ rank changes are client-side state while the user is typing. Persist to `base_activity_preference` on **rank input blur** (each row individually) and on **row reorder** (persist each affected row's new rank in sequence, not in a batch). Do not issue a network call on every keystroke. If a persist call fails, show an error toast and revert the row to its last confirmed rank.

**Remove preference row (draft)** — `delete().eq('id', preferenceId)` — only when `submitted_at IS NULL`.

**Submit preference set**

```
.rpc('app_base_unit_preference_submit', {
  p_unit_id:  selectedUnitId,
  p_event_id: selectedEvent.id,
})
```

_`app_base_unit_preference_submit` is the only submit path for preference locking in BA08; client code must not write `submitted_at` directly._

### 7.3 RLS / permission contracts

- `base_units`: organiser read/write scoped to `event_id`.
- `base_unit_role_types`: organiser read/write scoped to `event_id`.
- `base_unit_roles`: organiser read/write scoped to unit.
- `base_activity_preference`: INSERT/UPDATE allowed for event creators **or** users where `base_user_has_unit_role(unit_id, auth.uid())` returns true, and only while `submitted_at IS NULL`. The `base_user_has_unit_role()` DB function queries `rbac_user_units`. This is a database-enforced rule; the UI relies on `useSecureSupabase()` to pass the correct session context.

### 7.4 Cross-slice hand-offs

| Flow | Detail |
|------|--------|
| Consumes | Approved applications from **BA06** contract — applications with `status = 'approved'` |
| Provides | **BA08.contract** — `base_unit_roles` data consumed by BA17 (unit filter dropdown) |
| Reads | `base_activity_session` records created by **BA09** for the preference session list |
| Downstream | BA10, BA15, BA16, BA17 consume unit and role data from BA08's write contracts |

### 7.5 ID contracts

UUIDs as strings throughout. Do not expose raw unit, role, or preference UUIDs in prominent user-visible copy.

---

## 8. Data and schema references

| Artefact | Role |
|----------|------|
| **`base_units`** | Unit hierarchy CRUD root |
| **`base_unit_role_types`** | Role type CRUD |
| **`base_unit_roles`** | Role assignment upsert/remove |
| **`base_activity_preference`** | Draft preference CRUD; submit via RPC |
| **`base_activity_session`** | Read-only source for available sessions on /unit-preferences |
| **`base_application`** | Approved applicant pool for role assignment |
| **`core_events`** | `organisation_id` resolution for unit and role type inserts |
| **`core_person`** | Applicant name and email |
| **`app_base_unit_preference_submit(p_unit_id, p_event_id)`** | Preference submit mutation |

**DB triggers (confirmed present on dev-db `rkytnffgmwnnmewevqgp`):**

- `check_circular_unit_reference_trigger` (INSERT + UPDATE on `base_units`) — rejects circular parent assignments.
- `sync_base_unit_roles_event_org_trigger` (INSERT + UPDATE on `base_unit_roles`) — fills `event_id` and `organisation_id` automatically.
- `update_base_unit_role_types_updated_at` (UPDATE on `base_unit_role_types`) — fills `updated_at`. **No INSERT trigger** — `organisation_id` must be supplied by the client.

**MCP / dev-db verification status (project `rkytnffgmwnnmewevqgp`):**

1. ✅ `base_units` schema and triggers — confirmed.
2. ✅ `base_unit_role_types` schema — confirmed; `organisation_id NOT NULL`, no INSERT trigger — explicit resolution required (BR-ORG-RESOLVE).
3. ✅ `base_unit_roles` schema and `sync_base_unit_roles_event_org_trigger` — confirmed.
4. ✅ `base_activity_preference` schema — confirmed; UNIQUE `(unit_id, session_id)`, CHECK `rank > 0`; RLS `base_user_has_unit_role` enforced.
5. ✅ `app_base_unit_preference_submit` submit contract is wired as the canonical preference-lock mutation path.

---

## 9. pace-core2 imports

### §9.1 Imports table

| Symbol | Import path | One-line why |
|--------|-------------|--------------|
| `PagePermissionGuard`, `AccessDenied` | `@solvera/pace-core/rbac` | Route gates for both surfaces |
| `useSecureSupabase` | `@solvera/pace-core/rbac` | RLS-aware Supabase client |
| `useUnifiedAuth` | `@solvera/pace-core/hooks` | User ID and scope resolution |
| `useEvents` | `@solvera/pace-core/hooks` | `selectedEvent` — supplies `selectedEvent.id` |
| `DataTable` | `@solvera/pace-core/components` | Units, role types, and role assignment tables |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `@solvera/pace-core/components` | Three-tab layout on /units |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` | `@solvera/pace-core/components` | Section containers throughout |
| `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` | `@solvera/pace-core/components` | Confirmation flows |
| `ConfirmationDialog` | `@solvera/pace-core/components` | Delete / remove / submit confirms |
| `Button` | `@solvera/pace-core/components` | Actions throughout |
| `Input` | `@solvera/pace-core/components` | Rank number input on /unit-preferences |
| `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` | `@solvera/pace-core/components` | Unit selector, applicant selector, role type selector |
| `Alert`, `AlertTitle`, `AlertDescription` | `@solvera/pace-core/components` | Empty states, error states, submitted banner |
| `Badge` | `@solvera/pace-core/components` | Application status on role assignment |
| `LoadingSpinner` | `@solvera/pace-core/components` | Loading fallbacks |
| `useToast` | `@solvera/pace-core/hooks` | Mutation success/failure toasts |
| `NormalizeSupabaseError`, `HandleMutationError`, `ShowSuccessMessage`, `formatDateTime` | `@solvera/pace-core/utils` | Errors, toasts, date formatting |

### §9.2 Slice-specific caveats

**`DataTable` — `onImport` prop**

The import handler prop is `onImport` (not `onImportRows`). Use `onImport` for the Units tab DataTable import callback.

**`DataTable` — `features` config for Units tab**

Set `features` explicitly:

```ts
features: {
  search:           true,
  pagination:       true,
  sorting:          true,
  export:           true,
  grouping:         true,
  columnVisibility: true,
  editing:          true,
  creation:         true,
  import:           true,
  filtering:        false,
  selection:        false,
  deletion:         false,   // deletion via onDeleteRow row action, not bulk
  deleteSelected:   false,
  columnReordering: false,
  hierarchical:     false,
}
```

**`DataTable` — `features` config for Role Types tab**

```ts
features: {
  search:     true,
  pagination: true,
  sorting:    true,
  editing:    true,
  creation:   true,
  deletion:   false,  // deletion via onDeleteRow row action
  import:     false,
  export:     false,
  grouping:   false,
  filtering:  false,
  selection:  false,
  deleteSelected: false,
  columnVisibility: false,
  columnReordering: false,
  hierarchical: false,
}
```

**`DataTable` — `features` config for Role Assignment tab**

```ts
features: {
  search:     true,
  pagination: true,
  sorting:    true,
  editing:    false,
  creation:   false,
  deletion:   false,
  import:     false,
  export:     false,
  grouping:   false,
  filtering:  false,
  selection:  false,
  deleteSelected: false,
  columnVisibility: false,
  columnReordering: false,
  hierarchical: false,
}
```

**`useEvents()` — field name**

`selectedEvent.id` is the canonical event identifier. Do **not** use `selectedEvent.event_id` — that field does not exist on `EventStub`.

**`Input` — `onChange` signature**

`onChange` receives `(value: string) => void`, not a native `ChangeEvent<HTMLInputElement>`. Apply this when wiring the rank number input on /unit-preferences.

---

## 10. Permission and access rules

| Surface | Permission | Enforcement |
|---------|-----------|-------------|
| View `/units` | `read:page.units` (via `pageName="units"`) | `PagePermissionGuard` + RLS |
| Create / edit / delete units | `create:page.units` / `update:page.units` / `delete:page.units` | Guard wrappers on action affordances + RLS |
| Create / edit / delete role types | same `units` page permissions (units and role types share one page) | Guard wrappers + RLS |
| Assign / remove roles | `update:page.units` | Guard wrapper + RLS |
| View `/unit-preferences` | `read:page.unit-preferences` (via `pageName="unit-preferences"`) | `PagePermissionGuard` + RLS |
| Add / remove / edit draft preferences | `update:page.unit-preferences` | Guard wrapper + RLS (`submitted_at IS NULL` enforced by RLS) |
| Submit preferences | `update:page.unit-preferences` | Guard + RPC (`app_base_unit_preference_submit`) |

**RLS note on `base_activity_preference`:** INSERT and UPDATE are allowed only when `submitted_at IS NULL` **and** the user is either the event creator or passes `base_user_has_unit_role(unit_id, auth.uid())`. The `base_user_has_unit_role` function queries `rbac_user_units`. The consuming app does not manage `rbac_user_units` records directly — but the build agent must be aware this function is in the RLS policy chain and that it may deny writes for users not assigned to the unit in that table.

---

## 11. Acceptance criteria

### /units — Units tab

- Given event selected and no units exist, the Units tab DataTable shows "No units have been created for this event."
- Given event selected with units, the Units tab shows rows ordered by unit_number ascending with columns Unit #, Unit Name, Subcamp, Contingent, Parent Unit.
- Given creating a unit with a blank unit_number, the form shows "Unit number is required."
- Given creating a unit with unit_number "0", the form shows "Unit number must be a positive integer."
- Given creating a unit, the unit appears in the list and a success toast is shown.
- Given editing a unit, the unit_name field accepts blank input and saves as null (not empty string).
- Given deleting a unit, a ConfirmationDialog with the cascade warning appears; `window.confirm` is never called.
- Given confirming delete, the unit is removed and a "Unit deleted" toast appears.
- Given editing a unit's parent, the unit itself and its descendants do not appear in the parent options.
- Given importing a CSV with valid unit_number rows, units are created and a summary toast shows the count.
- Given a read-only permission, the create, edit, and delete affordances are not visible.

### /units — Role Types tab

- Given creating a role type with a blank title, the form shows "Role title is required."
- Given creating a role type, it appears in the list and a "Role type created" toast appears.
- Given deleting a role type, a ConfirmationDialog appears; on confirm, the type is removed.

### /units — Role Assignment tab

- Given no unit selected, the applicant selector, role type selector, and Assign Role button are not visible.
- Given selecting a unit, the applicant selector shows only applications with status "approved."
- Given all three selectors populated, pressing Assign Role assigns the role and a "Role assigned" toast appears.
- Given the same (unit_id, application_id) pair already has a role, pressing Assign Role updates the role_type_id (upsert).
- Given removing a role, a ConfirmationDialog appears; on confirm, "No role assigned" appears in the row.

### /unit-preferences

- Given no event selected, the page shows the select-event Card and no data loads.
- Given an event with no units, the unit selector shows the empty copy.
- Given an event with no sessions, the informative Alert appears and no preference form renders.
- Given selecting a unit with draft preferences, the Available Sessions and Preferences panels render.
- Given adding a session, it moves from Available Sessions to the Preferences list with rank auto-assigned.
- Given removing a preference row, the session returns to Available Sessions and remaining ranks are renumbered contiguously.
- Given manually editing a rank to introduce a gap, the Submit button is disabled and an inline validation message explains the issue.
- Given a valid ranked set, pressing Submit Preferences shows the ConfirmationDialog and confirms via `app_base_unit_preference_submit`.
- Given submitted preferences for a unit, the page shows the read-only submitted view with submission timestamp; no add/remove/submit controls are visible.
- Given a denied read permission on unit-preferences, `AccessDenied` renders.

---

## 12. Verification

1. **App (/units):** Open with seeded event (BA18) — units load, ordered by unit_number. Create, edit, and delete a unit. Verify cascade warning copy on delete dialog.
2. **App (/units):** Create a unit hierarchy (parent → child). Edit child, verify parent is excluded from parent options along with grandchild.
3. **App (/units):** Import a CSV with valid and invalid rows. Verify valid rows imported; invalid rows reported in toast.
4. **App (/units):** Create a role type. Assign it to an approved applicant for a unit. Verify only approved applications appear in the selector.
5. **App (/units):** Assign a role, then assign again with a different role type for the same applicant/unit pair — verify the role updates (upsert), not creates a second row.
6. **App (/unit-preferences):** Add sessions, reorder by editing rank inputs, verify contiguous numbering. Remove a session, verify renumbering.
7. **MCP:** Verify `check_circular_unit_reference_trigger` and `sync_base_unit_roles_event_org_trigger` are present on dev-db.
8. **MCP:** Confirm `base_unit_role_types` has no INSERT trigger; verify that creating a role type via UI supplies `organisation_id` correctly by inspecting the inserted row.
9. **MCP:** Confirm `base_activity_preference` UNIQUE constraint `(unit_id, session_id)` and CHECK `rank > 0`.
10. **App:** Verify denied access for a user without `read:page.units`.

---

## 13. Testing requirements

**Automated minimum**

- BR-UNIT-NUMBER: unit tests for valid integers ≥ 1, zero, negatives, floats, empty string.
- BR-OPTIONAL-FIELDS: unit tests for trimming and null coercion on create and edit.
- BR-ANTI-CIRCULAR-UI: unit test for `filterDescendants` — verifies recursive exclusion of the edited unit and all of its descendants.
- BR-APPLICANT-NAME: unit tests for full name composition with empty/partial fields and email fallback.
- BR-ROLE-UPSERT: integration test that calls assign twice for the same (unit_id, application_id) pair and verifies the second call updates rather than duplicates.
- BR-RANK-CONTIGUOUS: unit tests for renumbering after add (auto-rank), manual edit, and remove.
- Permission guard renders `AccessDenied` when `usePageCan` mock denies read.

**Concurrency:** n/a — standard PDLC quality gates apply.

---

## 14. Build execution rules

- **Stop** if `app_base_unit_preference_submit` is missing or its signature cannot be confirmed in the target environment before release; do not substitute a direct client write to `submitted_at`.
- **Do not** supply `event_id` or `organisation_id` in `base_unit_roles` insert payloads — the `sync_base_unit_roles_event_org_trigger` fills both. Passing them may conflict with trigger logic.
- **Always** resolve `organisation_id` from `core_events.organisation_id` before inserting into `base_units` or `base_unit_role_types`. Do not assume any default or session-level mechanism supplies this value.
- **Always** use `selectedEvent.id` (from `useEvents()`) as the event identifier — not `selectedEvent.event_id`.
- **Always** use the `onImport` prop on `DataTable` for the Units tab import handler — not `onImportRows`.
- **Never** use `window.confirm()` for delete or remove confirmations — use pace-core `ConfirmationDialog` exclusively.
- Scope is `/units` and `/unit-preferences` only. Do not absorb portal, TEAM, or BA10 routes.
- Stop on any RBAC page name / permission literals that are undefined in the consuming app catalogue.

---

## 15. Done criteria

- All §4 and §5 behaviours observable in preview environment with screenshots: loading, empty, error, create/edit/delete unit, role types CRUD, role assignment, preference draft add/remove/rank, preference submitted read-only, denied state.
- Preference submit flow verified against `app_base_unit_preference_submit` contract and recorded in build queue evidence.
- §12 verification flows completed; results noted in build queue evidence.
- QA pack executed; quality gates green.

---

## 16. Do not

- Do not use `window.confirm()` anywhere — all confirmations use pace-core `ConfirmationDialog`.
- Do not use `selectedEvent.event_id` — use `selectedEvent.id`.
- Do not use `onImportRows` on DataTable — use `onImport`.
- Do not supply `event_id` or `organisation_id` in `base_unit_roles` insert or update payloads — the trigger owns those fields.
- Do not assume a trigger or session default will supply `organisation_id` for `base_units` or `base_unit_role_types` inserts — resolve explicitly from `core_events`.
- Do not implement preference reopen or reset in this slice — that capability is out of scope for MVP and should not be alluded to in UI copy.
- Do not merge preference submission into booking allocation — preferences are inputs to an allocation process, not confirmed bookings.
- Do not show non-approved applications in the role assignment applicant selector.
- Do not ship a drawer for unit/role modals — use `Dialog` (centred) or DataTable built-in editing.
- Do not bypass `app_base_unit_preference_submit` by writing `submitted_at` directly from the client.
- Do not manage `rbac_user_units` records from this slice — that table is outside BA08 scope.
- Do not absorb activity session creation (BA09), participant booking (BA10), or communications (BA17) into this slice.

---

## 17. References

- `docs/requirements/BASE-architecture.md` — §5 Units And Group Coordination; route ownership; cross-slice hand-offs.
- `docs/requirements/BASE-project-brief.md` — delivery framing and BASE scope.
- `docs/requirements/BA06-applications-admin-and-review-requirements.md` — approved application pool consumed by role assignment.
- `docs/requirements/BA09-activity-offering-setup-requirements.md` — `base_activity_session` records consumed by `/unit-preferences` available sessions list.
- `docs/requirements/BA17-communications-and-system-notifications-requirements.md` — consumes BA08.contract (unit filter dropdown).
- `docs/requirements/BA18-base-dev-seed-data-requirements.md` — seed data for non-empty unit/preference verification.

---

## 18. Implementing agent instructions

- Read **§3 evaluation order** before wiring guards — denial beats empty state; loading beats both.
- Wire **`DataTable`** `features` **exactly** as §9.2 for each of the three tabs — defaults are too permissive without explicit overrides.
- **`useEvents()` returns `selectedEvent.id` — not `selectedEvent.event_id`.** This is a critical correctness requirement; the field does not exist.
- **`DataTable` import prop is `onImport`** — not `onImportRows`.
- Resolve `organisation_id` from `core_events` before every insert to `base_units` and `base_unit_role_types`. This is not automatic.
- Omit `event_id` and `organisation_id` from `base_unit_roles` insert payloads — the trigger fills them.
- Do not call `window.confirm()` — use `ConfirmationDialog` per §5 confirmation dialog copy table.
- Implement Submit Preferences (PD-PC-08) using `app_base_unit_preference_submit` only; keep add/remove/rank draft flows on direct table writes while `submitted_at IS NULL`.
- Use Australian English spelling in user-visible copy (e.g., "organiser", "organisation").
- Rank renumbering on /unit-preferences is client-side state management — persist individual rank updates to `base_activity_preference` on blur or re-order, but do not make a network call for every keystroke.
- If PostgREST embed names fail type-check, adjust relationship names against the generated types while preserving column allow-lists.
- Raise documentation defects instead of enlarging scope silently.

**Quality gates before marking Done**

- [ ] All functional specification items implemented and demonstrable.
- [ ] All acceptance criteria verified (not pre-ticked).
- [ ] `lint`, `type-check`, `tests`, `validate` all pass.
- [ ] Visual evidence for required states captured.
- [ ] QA pack run recorded.

---

## 19. Open questions

No unresolved BA08 open questions for this run.
