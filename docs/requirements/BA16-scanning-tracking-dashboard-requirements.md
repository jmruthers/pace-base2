# BA16 — Scanning Tracking Dashboard

## Slice metadata

- Status: Draft
- Depends on: BA12 (scan-point admin — "View Tracking Dashboard" button entry; `base_scan_point` data source), BA13 (scanning runtime — source of `base_scan_event` data via BA14 flush), BA14 (sync worker — writes `base_scan_event` rows that BA16 reads), BA06 (approved application states — `base_application.status = 'approved'`)
- Backend impact: Read-only. No schema changes, RPCs, or new RLS policies introduced by this slice. All required tables are live in dev-db (`rkytnffgmwnnmewevqgp`). The `base_scan_event` SELECT RLS policy (`read:page.scanning`) specified in BA12 §7.1 is a prerequisite; BA16 does not define or deploy that policy.
- Frontend impact: UI — `/scanning/tracking`

---

## 2. Overview

BA16 delivers a read-only operational tracking dashboard at `/scanning/tracking`. It surfaces live scan data to event operators and administrators, showing where approved participants are at any point during an event. The dashboard derives participant presence state (on-site, off-site, never scanned) from `base_scan_event` rows flushed by BA14, with drill-down groupings by scan location. BA16 has no write path, no queue dependency, and no comparison against booking or assignment tables — it reads `base_scan_event` and `base_scan_point` directly via the authenticated Supabase client.

Operators navigate to the dashboard from BA12's `/scanning` admin hub via a dedicated "View Tracking Dashboard" button. There is no sidebar navigation entry for BA16. Data is fetched on page load and on explicit operator-initiated refresh; no real-time subscription or WebSocket push is in scope for MVP.

---

## 3. What this slice delivers

### Boundaries

The following surfaces are out of scope for BA16:

- Scan-point admin (`/scanning`) — BA12
- Scanning runtime (`/scanning/:scanPointId`) — BA13
- Sync worker and queue state — BA14
- Conflict review UI — BA12 (BA16 shows upload-conflict rows in participant history only; BA12 owns the conflict review section)
- Data export — BA15 owns all scan-event reporting; BA16 has no export affordance
- Card lifecycle management — TEAM-owned

### Architectural posture

1. > **Route read access:** Enforced by the app authenticated shell / PaceAppLayout `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). The page component must not wrap content in an outer `PagePermissionGuard operation="read"` unless this slice explicitly requires a **scoped read** override (`scope={{ organisationId, eventId, appId }}`).
2. All reads use `useSecureSupabase()` from `@solvera/pace-core/rbac`. No service_role client is used anywhere in this slice (read-only surface).
3. The two-step query pattern is mandatory for all `base_scan_event` queries: (1) fetch `base_scan_point.id` values for the current event; (2) filter `base_scan_event` with `.in('scan_point_id', scanPointIds)`. Direct nested PostgREST filters on `scan_point.event_id` are prohibited.
4. `useEvents()` provides `selectedEvent`, `selectedEvent.id`, `selectedEvent.name`, and `selectedOrganisation` (the active organisation context) for all query scoping. Both `selectedEvent` and `selectedOrganisation` must be non-null before any data fetch runs; data fetches are skipped if either is null.
5. React Query manages all data fetches with `staleTime: 0` (tracking data freshness is critical). Explicit refresh clears the query cache for the tracking namespace and re-fetches all sections.
6. Mobile-optimised: stacked responsive layout on narrow viewports, following the same approach as BA13.
7. Navigation entry: a "View Tracking Dashboard" `Button variant="default"` in BA12's `/scanning` admin hub calls `navigate('/scanning/tracking')`. No sidebar entry is added for BA16.
8. The last-updated timestamp derives from the most recent successful fetch completion and is displayed in the page heading block.

### Page-level guards and evaluation ordering for `/scanning/tracking`

1. > **Route read access:** Enforced by the app authenticated shell / PaceAppLayout `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). The page component must not wrap content in an outer `PagePermissionGuard operation="read"` unless this slice explicitly requires a **scoped read** override (`scope={{ organisationId, eventId, appId }}`).

2. **Route read access** is enforced by the authenticated shell / `PaceAppLayout` `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). If access is denied, `AccessDenied` renders in the shell main region. No blocking event-selection message replaces or precedes denial.
2. If the guard is loading and no custom `loadingFallback` prop is supplied, `PagePermissionGuard` renders null. A null Supabase client (transient auth initialisation) renders a centred `LoadingSpinner` in the main content region.
3. If the guard permits and no event is selected (`selectedEvent` is null or `selectedEvent.id` is falsy), the page shows a blocking `Card` with `CardTitle` "No event selected" and `CardDescription` "Select an event from the header to view tracking data." Data fetches do not run. No tab content renders.
4. If the guard permits and an event is selected, all four tabs load for that `event_id`.

---

## 4. Functional specification

**Prefix legend:** `TR` — tracking page-level; `SP` — site presence tab; `AT` — activity tab; `TP` — transport tab; `PH` — participant history tab.

---

### Page entry and guards

1. **TR-PE-01 —** Navigating to `/scanning/tracking` renders inside the BA00 authenticated shell with no mandatory query parameters.
2. **TR-PE-02 —** With a guard pass and an event selected, the page renders a heading block containing: `h1` "Tracking Dashboard", a subtitle naming the current event, a last-updated timestamp, and a "Refresh" `Button variant="outline"`.
3. **TR-PE-03 —** While any page-level data query (scan points, approved participants) is unresolved, the corresponding section displays a `LoadingSpinner`. Each tab section loads independently.
4. **TR-PE-04 —** The last-updated timestamp is formatted using `formatDateTime` and is updated each time an explicit refresh completes successfully. On initial load it is set when the first full data fetch completes.
5. **TR-PE-05 —** Pressing "Refresh" invalidates the React Query cache for all tracking queries (`queryKey` prefixed with `['ba16', selectedEvent.id]`) and re-fetches all tab sections. While the re-fetch is in progress, the "Refresh" button is `disabled` and shows an inline `LoadingSpinner`.

### No-event state

6. **TR-ES-01 —** When no event is selected, the page renders a full-width blocking `Card` below the heading block with `CardTitle` "No event selected" and `CardDescription` "Select an event from the header to view tracking data." No tab content renders and no data fetches run.

### Loading state

7. **TR-LS-01 —** A null Supabase client renders a centred `LoadingSpinner` in the main content region before any tab content is shown.
8. **TR-LS-02 —** While the step-1 scan-point query (fetch `base_scan_point` rows for the event) is in progress, each tab body shows a centred `LoadingSpinner`. Tab navigation remains operable.

---

### Tab layout

9. **TR-TB-01 —** The page uses a `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` layout from `@solvera/pace-core/components`. Four tabs are rendered in this order: **Site Presence**, **Activity**, **Transport**, **Participant History**.
10. **TR-TB-02 —** The default active tab on page load is **Site Presence**.
11. **TR-TB-03 —** On narrow viewports (below the `sm` breakpoint), the `TabsList` wraps to a two-row flex layout. Each `TabsTrigger` remains full-width within its row.

---

### Site Presence tab (SP)

#### Headline tiles

12. **SP-HT-01 —** The Site Presence tab opens with three `Card` summary tiles displayed in a responsive grid: On-site (N), Off-site (N), Never Scanned (N). On viewports at or above `sm`, the three tiles are arranged in a three-column grid. On narrower viewports, the tiles stack vertically.
13. **SP-HT-02 — On-site count derivation:** A participant is counted as on-site when their most recent accepted scan (`validation_result IN ('accepted', 'accepted_override')`) at a site-context scan point (`context_type = 'site'`) has `direction IN ('in', 'both')`. Only `base_scan_event` rows with `validation_result IN ('accepted', 'accepted_override')` are considered when determining the most-recent scan for state derivation.
14. **SP-HT-03 — Off-site count derivation:** A participant is counted as off-site when their most recent accepted scan at a site-context scan point has `direction = 'out'`.
15. **SP-HT-04 — Never-scanned count derivation:** A participant is counted as never scanned when they have zero `base_scan_event` rows for any `scan_point_id` in the event, regardless of scan point type. This is computed by a LEFT JOIN (or NOT EXISTS) of the approved `base_application` population against `base_scan_event`.
16. **SP-HT-05 — No-accepted-scan exclusion:** A participant who has no `accepted` or `accepted_override` rows for any scan point in the event — regardless of whether they have `rejected`, `upload_conflict`, or any other rows — is excluded from all three headline tile counts. Such a participant is visible only in the Participant History tab. See BR-PS-04.
17. **SP-HT-06 — State priority:** On-site/off-site state is determined solely by the most recent accepted scan at a site-context scan point (highest `scanned_at` among accepted rows at `context_type = 'site'`). Non-site scan events do not affect on-site/off-site state determination; they are used only for off-site location grouping.
18. **SP-HT-07 —** Each headline tile is a `Card` with `CardTitle` showing the label ("On-site", "Off-site", "Never Scanned") and `CardContent` showing the count as a large numeric display. Tiles have `role="status"` and an `aria-label` of the form "On-site: {N} participants" for screen reader accessibility.
19. **SP-HT-08 —** If the approved participant population for the event is zero, all three tiles display 0. No special warning is shown for a zero population at this level.

#### On-site location breakdown

20. **SP-OD-01 —** Below the headline tiles, the On-site section renders a list of location groups. Each group corresponds to a distinct `base_scan_point.name` (within `context_type = 'site'`) that is the last accepted site scan point for at least one on-site participant. The group shows the scan point name and the count of participants whose last accepted site scan was at that point.
21. **SP-OD-02 —** Groups are ordered by count descending (largest group first).
22. **SP-OD-03 —** Each group is clickable. Clicking a group expands an inline list of participants in that group. Each participant row shows: participant name (derived from `core_person.preferred_name` if non-null and non-empty, otherwise `first_name || ' ' || last_name`) and the `scanned_at` timestamp of their last accepted site scan formatted with `formatDateTime`.
23. **SP-OD-04 —** Clicking an expanded group again collapses the participant list.
24. **SP-OD-05 —** If no on-site participants exist, the On-site section renders the text "No participants are currently on-site." in `text-sm text-muted-foreground`.

#### Off-site location breakdown

25. **SP-FD-01 —** Below the On-site section, the Off-site section renders a list of location groups showing WHERE off-site participants currently are. Each group corresponds to a distinct combination of `base_scan_point.name` and `context_type` for the last accepted scan at any non-site scan point belonging to an off-site participant.
26. **SP-FD-02 —** For each off-site participant, their last accepted scan at any non-site scan point (highest `scanned_at` among accepted rows at scan points where `context_type != 'site'`) determines their displayed current location. Client-side derivation: cross-reference the off-site participant list (by `member_id`) against the non-site accepted scan result set. Any off-site participant whose `member_id` does not appear in the non-site result set is assigned to an "Unknown location" group. The "Unknown location" group is displayed last (after all named groups regardless of count), with its label rendered in `text-muted-foreground` to distinguish it from confirmed location groups. If the "Unknown location" group has zero members, it is not rendered.
27. **SP-FD-03 —** Each group label shows the scan point name and its context type in parentheses, e.g. "Archery Range (Activity) — 18". Groups are ordered by count descending.
28. **SP-FD-04 —** Clicking a group expands an inline participant list. Each participant row shows: participant name and the `scanned_at` timestamp of their last accepted non-site scan formatted with `formatDateTime`.
29. **SP-FD-05 —** If no off-site participants exist, the Off-site section renders the text "No participants are currently off-site." in `text-sm text-muted-foreground`.

---

### Activity tab (AT)

30. **AT-PE-01 —** The Activity tab shows all scan points in the event where `context_type = 'activity'`, regardless of `is_active` status.
31. **AT-PC-01 —** Each activity scan point is displayed as a row containing: the scan point name, a `Badge` showing the scan point `direction` (label map: `in` → "In", `out` → "Out", `both` → "Both", `neutral` → "Neutral"), and the count of accepted scans (`validation_result IN ('accepted', 'accepted_override')`) at that scan point.
32. **AT-PC-02 —** Rows are ordered by scan count descending (highest first).
33. **AT-PC-03 —** Clicking a row expands an inline participant list showing all participants with an accepted scan at that scan point. Each participant row shows: participant name and the `scanned_at` timestamp formatted with `formatDateTime`.
34. **AT-PC-04 —** Clicking an expanded row collapses the participant list.
35. **AT-ES-01 —** If no activity scan points exist for the event, the Activity tab renders the text "No activity scan points are configured for this event." in `text-sm text-muted-foreground`.
36. **AT-ES-02 —** If an activity scan point exists but has zero accepted scans, its count displays as 0 and its participant list is empty ("No accepted scans at this scan point.").

---

### Transport tab (TP)

37. **TP-PE-01 —** The Transport tab shows all scan points in the event where `context_type = 'transport'`, regardless of `is_active` status.
38. **TP-PC-01 —** Each transport scan point is displayed as a row containing: the scan point name, a `Badge` showing the scan point `direction` (same label map as AT-PC-01), and the count of accepted scans (`validation_result IN ('accepted', 'accepted_override')`) at that scan point.
39. **TP-PC-02 —** Rows are ordered by scan count descending (highest first).
40. **TP-PC-03 —** Clicking a row expands an inline participant list showing all participants with an accepted scan at that scan point. Each participant row shows: participant name and the `scanned_at` timestamp formatted with `formatDateTime`.
41. **TP-PC-04 —** Clicking an expanded row collapses the participant list.
42. **TP-ES-01 —** If no transport scan points exist for the event, the Transport tab renders the text "No transport scan points are configured for this event." in `text-sm text-muted-foreground`.
43. **TP-ES-02 —** If a transport scan point exists but has zero accepted scans, its count displays as 0 and its participant list is empty ("No accepted scans at this scan point.").

---

### Participant History tab (PH)

44. **PH-SE-01 —** The Participant History tab renders a search `Input` labelled "Search participant" with placeholder "Enter name or card identifier…". Search fires server-side when the operator has typed at least 2 characters, with a 200ms debounce.
45. **PH-SE-02 —** The search query runs against `base_application` (for participant name via `core_person`) and `core_member_card` (for `card_identifier`) for the current event (`status = 'approved'`). Results are capped at 20 participants.
46. **PH-SE-03 —** Search results appear in a dropdown list below the search `Input`. Each result row is a `button` element showing the participant name and, where a `core_member_card` row is found, the card identifier in `text-muted-foreground`. Selecting a result populates the history section below.
47. **PH-SE-04 —** If the search term is at least 2 characters and no results are found, the dropdown shows a single non-interactive row "No participants found." in `text-muted-foreground`.
48. **PH-SE-05 —** A clear `Button variant="ghost" size="icon"` × beside the search `Input` appears when a participant is selected. Pressing it clears the selection and resets the search `Input`.

#### History list

49. **PH-HL-01 —** When a participant is selected, all `base_scan_event` rows for that participant across the current event are loaded using the two-step query pattern and ordered by `scanned_at` descending (most recent first).
50. **PH-HL-02 —** The history is rendered as a `DataTable` with the following columns (in order): **Scan point** (`base_scan_point.name` from the step-1 scan-point data, plain text), **Direction** (`Badge` per the direction label map), **Result** (`Badge` per the result badge mapping in PH-HL-04), **Reason** (`validation_reason` text or "—" when null), **Scanned at** (formatted `scanned_at` using `formatDateTime`), **Device** (`device_id` or "—" when null).
51. **PH-HL-03 —** The `DataTable` features config: search disabled, pagination enabled (client-side), sorting enabled; creation, editing, deletion, export, import, filtering, selection disabled. This feature set follows the same `DataTable` features prop API confirmed in BA12 §5. No additional verification needed beyond BA12 precedent.
52. **PH-HL-04 — Result badge mapping:**
    - `accepted` → `Badge variant="solid-main-normal"` "Accepted"
    - `accepted_override` → `Badge variant="solid-acc-normal"` "Accepted (override)"
    - `rejected` → `Badge variant="solid-sec-muted"` "Rejected"
    - `upload_conflict` → `Badge variant="outline-acc-muted"` "Upload conflict" (warning badge per Q-C3 resolution)
53. **PH-HL-05 — `upload_conflict` rows:** Rows where `validation_result = 'upload_conflict'` are included in the history `DataTable` and rendered with the warning badge described in PH-HL-04. They are not filtered out. They do not contribute to on-site, off-site, or never-scanned headline tile calculations.
54. **PH-HL-06 —** Each `DataTable` row for an `upload_conflict` event additionally renders a `Badge variant="outline-acc-muted"` labelled "Upload conflict" in the Result column. No additional row annotation (such as an Alert or separate section) is required beyond the badge.
55. **PH-ES-01 —** If the selected participant has zero `base_scan_event` rows for the event, the `DataTable` displays its empty state with description "No scan events recorded for this participant in this event."
56. **PH-ES-02 —** If no participant has been selected yet, the history section renders the text "Search for a participant to view their scan history." in `text-sm text-muted-foreground`.

---

---

## Visual specification

- Prototype reference: align tracking dashboard with **ScanRuntimePage** "Last 8 scans" aside (`UnitsActivitiesScanPage.jsx`) — expanded to full `/scanning/tracking` dashboard with event-wide scan history and filters in pass 2.
- Prototype route: none (queue notes align with scan list patterns).
- **Route map:** production `/scanning/tracking` — tracking dashboard beyond runtime's last-8 panel.

### Layout — `/scanning/tracking`

- **Shell:** BA00 authenticated shell (sidebar remains); entry from BA12 **"View Tracking Dashboard"** only.
- **Heading block:** `h1` **"Tracking Dashboard"**, event subtitle, **last updated** timestamp, **Refresh** outline button (TR-PE-02–05).
- **Tabs (default Site Presence):** **Site Presence** | **Activity** | **Transport** | **Participant History** (TR-TB-01–03).
- **Site Presence:** three headline **Card** tiles (On-site / Off-site / Never Scanned), then expandable **on-site** and **off-site** location groups (SP-OD-*, SP-FD-*).
- **Activity / Transport tabs:** expandable scan-point rows with accepted-scan counts (AT-*, TP-*).
- **Participant History:** search **Input** + chronological **DataTable** (PH-*).
- **Prototype anchor:** runtime **"Last 8 scans"** aside (`ScanRuntimePage`) informs row density (time, name, unit) — expanded here to event-wide, tabbed dashboard.

### Implementation delta (pass 2)

- Build tracking page from runtime recent-scan **list row pattern** at dashboard scale; **no prototype route**.

---

## 5. Error states

1. **TR-ER-01 —** Step-1 scan-point query failure: `Alert variant="destructive"` with the normalised error message from `normalizeSupabaseError` and a `Button variant="outline" size="small"` labelled "Retry" below the `AlertDescription`, which refetches the scan-point query. The four tabs do not render while the scan-point step-1 data is unavailable.
2. **TR-ER-02 —** Approved participant population query failure (for never-scanned count): `Alert variant="destructive"` in the Site Presence tab content area with normalised error and a "Retry" `Button`.
3. **TR-ER-03 —** Scan event query failure (for any tab): `Alert variant="destructive"` in the affected tab's content area with normalised error and a "Retry" `Button`.
4. **TR-ER-04 —** Participant history query failure: `Alert variant="destructive"` in the Participant History tab below the search `Input` with normalised error and a "Retry" `Button`.
5. **TR-ER-05 —** Explicit refresh failure: `toast variant="destructive"` with the normalised error message. The last-updated timestamp is not updated. The existing data remains visible.
6. **TR-ER-06 —** Query cap reached (BR-QC-01): an inline `Alert variant="default"` (informational, not destructive) is shown within the affected tab section: "Result set capped at 500 rows. Some data may be omitted. Consider narrowing the event scope." This is an inline notice, not a toast.

---

## 6. Business rules

### BR-RO-01 — Read-only surface

BA16 does not write to any table. No INSERT, UPDATE, or DELETE is issued from any BA16 code path against `base_scan_event`, `base_scan_point`, `base_application`, `base_units`, or any other table.

### BR-PS-01 — On-site derivation

A participant is on-site when their most recent accepted scan (`validation_result IN ('accepted', 'accepted_override')`) at a scan point where `context_type = 'site'` has `direction IN ('in', 'both')`.

### BR-PS-02 — Off-site derivation

A participant is off-site when their most recent accepted scan at a scan point where `context_type = 'site'` has `direction = 'out'`.

### BR-PS-03 — Never-scanned derivation

A participant is never scanned when they have zero `base_scan_event` rows for any `scan_point_id` belonging to the current event, across all scan point types. The computation bridges `base_application.person_id → core_person.id → core_member.person_id → core_member.id = base_scan_event.member_id`. For each approved `base_application` row, resolve the participant's `core_member.id` via the join chain defined in §7.3, then check whether that `member_id` appears in any `base_scan_event` row for the event's scan points. Participants with no matching `base_scan_event` row are counted as never scanned.

### BR-PS-04 — No-accepted-scan exclusion

A participant is excluded from all headline tile counts (on-site, off-site, and never-scanned) if they have no `accepted` or `accepted_override` rows for any scan point in the event — regardless of whether their only rows are `rejected`, `upload_conflict`, or any combination. Such participants are visible in Participant History only; they do not appear in any headline tile count. This exclusion ensures headline counts reflect only participants with meaningful accepted presence records.

### BR-PS-05 — State priority

On-site/off-site determination uses only site-context scan points (`context_type = 'site'`). The most recent accepted scan at a site-context scan point (highest `scanned_at` among `accepted` and `accepted_override` rows at site-context points) is the sole determinant of on-site/off-site state. Non-site scan events affect off-site location grouping only.

### BR-PS-06 — Approved participant population

The participant population for all headline tile derivations is the set of `base_application` rows for `selectedEvent.id` where `status = 'approved'`. Non-approved applications are not included.

### BR-TS-01 — Two-step query mandatory

All `base_scan_event` queries in BA16 must use the two-step pattern:

**Step 1:**
```ts
const { data: pointRows } = await supabase
  .from('base_scan_point')
  .select('id, name, context_type, direction, is_active, event_id, organisation_id')
  .eq('event_id', selectedEvent.id)
  .eq('organisation_id', selectedOrganisation.id);
const scanPointIds = pointRows?.map(r => r.id) ?? [];
if (scanPointIds.length === 0) return [];
```

**Step 2:**
```ts
supabase
  .from('base_scan_event')
  .select('id, scan_point_id, member_id, validation_result, validation_reason, scanned_at, device_id, override_by, notes')
  .in('scan_point_id', scanPointIds)
  // additional filters per section
  .limit(500)
```

Direct nested PostgREST filters (e.g. `.eq('scan_point.event_id', ...)`) are prohibited throughout BA16.

### BR-QC-01 — Query cap

All `base_scan_event` queries are capped at 500 rows per section (`.limit(500)`) to prevent client-side performance degradation on large events. If the returned row count equals 500, an informational notice is shown in the affected section (TR-ER-06). This cap is documented in §16 Do not.

### BR-UC-01 — `upload_conflict` in history

`upload_conflict` rows are included in the Participant History `DataTable` and rendered with the warning badge specified in PH-HL-04. They are excluded from on-site, off-site, and never-scanned headline tile calculations because `upload_conflict` is not an `accepted` or `accepted_override` result. Participants with only `upload_conflict` rows (and no `accepted` or `accepted_override` rows) are excluded from all headline counts per BR-PS-04.

### BR-IM-01 — Immutable event data

BA16 surfaces `base_scan_event` as an immutable audit record consistent with BA14 BR-IO-02. No edit, override, or delete affordance is rendered on any scan event row in any BA16 surface.

---

## 7. Data contracts

### §7.1 — `base_scan_event` read contract

Columns selected: `id`, `scan_point_id`, `member_id`, `validation_result`, `validation_reason`, `scanned_at`, `device_id`, `override_by`, `notes`. Note: `application_id` is always null in MVP per BA14 §7.1 and is not selected. `scan_card_id` is not selected — it is irrelevant to tracking display.

All queries follow the two-step pattern (BR-TS-01). `synced_at` and `scan_card_id` are not selected by BA16 — they are irrelevant to the tracking dashboard display and omitting them reduces payload size.

#### Site Presence derivation query (step 2 example):

```ts
supabase
  .from('base_scan_event')
  .select('id, scan_point_id, member_id, validation_result, scanned_at')
  .in('scan_point_id', scanPointIds)
  .in('validation_result', ['accepted', 'accepted_override'])
  .order('scanned_at', { ascending: false })
  .limit(500)
```

Client-side logic groups results by `member_id`, picks the most recent row per member at site-context scan points (determined by matching `scan_point_id` to the step-1 `pointRows` by `context_type = 'site'`), and derives on-site/off-site state from the `direction` of that row's scan point.

#### Never-scanned derivation:

Step 1 scan-point IDs are compared against the `base_application` approved population. For each approved participant whose `id` (or `person_id`/`member_id` join chain) does not appear in any `base_scan_event` row scoped to the event's scan-point IDs, they are counted as never scanned.

### §7.2 — `base_scan_point` read contract

Columns selected: `id`, `name`, `context_type`, `direction`, `resource_type`, `resource_id`, `is_active`, `event_id`, `organisation_id`.

Step 1 of every two-step query fetches this full column set. The result is held in React Query cache and reused across all tab derivations without re-fetching.

### §7.3 — `base_application` read contract

Columns selected: `id`, `person_id`, `event_id`, `status`.

Filtered on `status = 'approved'` and `event_id = selectedEvent.id`. This query establishes the approved participant population for never-scanned computation and headline tile denominators.

```ts
supabase
  .from('base_application')
  .select('id, person_id, event_id, status')
  .eq('event_id', selectedEvent.id)
  .eq('organisation_id', selectedOrganisation.id)
  .eq('status', 'approved')
  .limit(500)
```

#### `person_id → member_id` join chain (required for never-scanned computation)

`base_application` stores `person_id` (FK → `core_person.id`). `base_scan_event` stores `member_id` (FK → `core_member.id`). The bridge is `core_member.person_id → core_person.id` (confirmed live in dev-db).

Full join chain: `base_application.person_id = core_person.id = core_member.person_id → core_member.id = base_scan_event.member_id`

For the never-scanned computation, the client must:
1. Load the approved `base_application` rows (fetching `person_id` per row).
2. For each `person_id`, resolve the corresponding `core_member.id` via a lookup: `from('core_member').select('id, person_id').in('person_id', approvedPersonIds).eq('organisation_id', selectedOrganisation.id)` — capped at 500.
3. Compare the resolved `member_id` set against the `base_scan_event` rows' `member_id` values (fetched in step 2 of the two-step pattern). Any approved participant whose `core_member.id` does not appear in any `base_scan_event` row for the event is counted as never scanned.

`core_member` schema (live in dev-db, TEAM-owned): `id uuid NOT NULL`, `person_id uuid NOT NULL → core_person.id`, `organisation_id uuid NOT NULL`, `membership_status` (enum), `membership_number text?`, `joined_at timestamptz NOT NULL`, `valid_from date?`, `valid_to date?`, `deleted_at timestamptz?`.

### §7.4 — Participant name resolution

Participant names are resolved by joining `base_application` to `core_person` via `person_id`. The PostgREST embedded-resource query extends the §7.3 `base_application` query:

```ts
supabase
  .from('base_application')
  .select('id, person_id, event_id, status, core_person(preferred_name, first_name, last_name)')
  .eq('event_id', selectedEvent.id)
  .eq('organisation_id', selectedOrganisation.id)
  .eq('status', 'approved')
  .limit(500)
```

The `core_person` object is embedded on each `base_application` row. Display name derivation: `preferred_name` if non-null and non-empty string; otherwise `first_name || ' ' || last_name`. A row where `core_person` is null (orphaned application) displays "—".

`core_person` schema (live, TEAM-owned): `id uuid NOT NULL`, `first_name text NOT NULL`, `last_name text NOT NULL`, `preferred_name text?`, `email text?`, `middle_name text?`, `date_of_birth date?`.

### §7.5 — BA16 provisions to consumers

BA16 is a terminal consumer. It provides no data contracts to other slices.

### §7.6 — Participant search query (Participant History tab)

The PH-SE-02 search runs server-side when the operator has typed at least 2 characters. It queries in two steps:

**Step A — search by name:**
```ts
supabase
  .from('base_application')
  .select('id, person_id, event_id, status, core_person(preferred_name, first_name, last_name)')
  .eq('event_id', selectedEvent.id)
  .eq('organisation_id', selectedOrganisation.id)
  .eq('status', 'approved')
  .or(`core_person.preferred_name.ilike.%${term}%,core_person.first_name.ilike.%${term}%,core_person.last_name.ilike.%${term}%`)
  .limit(20)
```

**Step B — search by card identifier:**
```ts
supabase
  .from('core_member_card')
  .select('id, member_id, card_identifier, core_member(id, person_id)')
  .eq('organisation_id', selectedOrganisation.id)
  .ilike('card_identifier', `%${term}%`)
  .eq('is_active', true)
  .limit(20)
```

Results from both steps are merged client-side, de-duplicated by `person_id` (resolved from the Step B chain: `core_member_card.member_id → core_member.id → core_member.person_id`), and capped at 20 total results. The join chain from `core_member_card` to `core_person` is: `core_member_card.member_id → core_member.id → core_member.person_id → core_person.id`.

Each search result is keyed by `base_application.id` for the history load query. When a search result is selected, the Participant History load query (PH-HL-01) runs with:
```ts
supabase
  .from('base_scan_event')
  .select('id, scan_point_id, member_id, validation_result, validation_reason, scanned_at, device_id, override_by, notes')
  .in('scan_point_id', scanPointIds)         // step-1 scan-point IDs per BR-TS-01
  .eq('member_id', resolvedMemberId)         // core_member.id resolved from the search result
  .order('scanned_at', { ascending: false })
  .limit(500)
```

`resolvedMemberId` is derived from `base_application.person_id → core_member.person_id → core_member.id` for name-search results, or directly from `core_member_card.member_id → core_member.id` for card-identifier-search results.

The React Query key for the search is `['ba16', selectedEvent.id, 'search', term]` with `staleTime: 0`.

---

## 8. Key data fields used

| Field | Table | Type | BA16 use |
|-------|-------|------|---------|
| `scan_point_id` | `base_scan_event` | uuid NOT NULL | Two-step query filter; links events to scan point name and context |
| `member_id` | `base_scan_event` | uuid NOT NULL | Groups scan events by participant for state derivation |
| `application_id` | `base_scan_event` | uuid nullable | Always null in MVP per BA14 §7.1. Not selected by BA16. |
| `validation_result` | `base_scan_event` | enum NOT NULL | State derivation (`accepted`, `accepted_override`, `rejected`, `upload_conflict`) |
| `validation_reason` | `base_scan_event` | enum nullable | Participant history display; shown as "—" when null |
| `scanned_at` | `base_scan_event` | timestamptz NOT NULL | "Most recent scan" determination; timestamp display |
| `device_id` | `base_scan_event` | text nullable | Participant history column |
| `override_by` | `base_scan_event` | uuid nullable | Participant history column |
| `notes` | `base_scan_event` | text nullable | Participant history column |
| `id` | `base_scan_point` | uuid NOT NULL | Two-step query step-1 result; key for joining event names |
| `name` | `base_scan_point` | text NOT NULL | Location group labels; participant history "Scan point" column |
| `context_type` | `base_scan_point` | text NOT NULL | Filters site vs non-site; tab scoping (activity, transport) |
| `direction` | `base_scan_point` | text NOT NULL | On-site/off-site derivation (`in`, `out`, `both`, `neutral`) |
| `id` | `base_application` | uuid NOT NULL | Never-scanned computation denominator |
| `person_id` | `base_application` | uuid NOT NULL | Join to `core_person` for participant name resolution |
| `status` | `base_application` | text NOT NULL | Filter to `approved` population |
| `card_identifier` | `core_member_card` | text NOT NULL | Participant history search matching |
| `preferred_name` | `core_person` | text nullable | Participant display name (primary) |
| `first_name` | `core_person` | text nullable | Participant display name (fallback) |
| `last_name` | `core_person` | text nullable | Participant display name (fallback) |

---

## 9. Permissions and RBAC

| Action | Permission | Client |
|--------|-----------|--------|
| Read `base_scan_event` | `read:page.scanning` | Authenticated (`useSecureSupabase()`) |
| Read `base_scan_point` | `read:page.scanning` | Authenticated |
| Read `base_application` | `read:page.applications` | Authenticated |
| Read `core_member_card` (for participant search) | TEAM-owned RLS (read-permitted via event context) | Authenticated |

Route read for `/scanning/tracking` is enforced by the shell `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). A user who can access BA12's `/scanning` hub automatically satisfies the same permission for `/scanning/tracking`. No separate tracking-specific permission string is defined (Q-S1 resolution).

RLS enforces scope at the database layer. Client-side `PagePermissionGuard` is defensive UI gating, not the sole security boundary.

---

## 10. Component map

| Symbol | Import path | BA16 use |
|--------|-------------|---------|
| `Badge` | `@solvera/pace-core/components` | Direction badges, result badges in history, upload-conflict warning badge |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` | `@solvera/pace-core/components` | Headline tiles, no-event-selected state, error containers |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `@solvera/pace-core/components` | Four-tab layout (Site Presence, Activity, Transport, Participant History) |
| `DataTable` | `@solvera/pace-core/components` | Participant history table |
| `Input` | `@solvera/pace-core/components` | Participant search field in Participant History tab |
| `Button` | `@solvera/pace-core/components` | Refresh action, group expand/collapse triggers, participant history clear, retry controls |
| `Button variant="ghost"` (expand/collapse) | `@solvera/pace-core/components` | Group expand/collapse controls in Site Presence, Activity, and Transport tabs — raw controlled state with `aria-expanded` and `aria-controls`; no `Accordion` or `Disclosure` component used |
| `LoadingSpinner` | `@solvera/pace-core/components` | Auth-init loading, per-section loading, refresh-in-progress |
| `Alert`, `AlertTitle`, `AlertDescription` | `@solvera/pace-core/components` | Error states per section, query cap notice |
| `toast` | `@solvera/pace-core/components` | Refresh failure feedback |
| `PagePermissionGuard`, `AccessDenied` | `@solvera/pace-core/rbac` | Route gating |
| `useSecureSupabase` | `@solvera/pace-core/rbac` | RLS-aware Supabase client for all tracking queries |
| `useEvents` | `@solvera/pace-core/hooks` | `selectedEvent.id`, `selectedEvent.name`, and `selectedOrganisation` for all query scoping; null-guarded before any fetch |
| `normalizeSupabaseError` | `@solvera/pace-core/utils` | Error message normalisation for alerts and toasts |
| `formatDateTime` | `@solvera/pace-core/utils` | `scanned_at` and last-updated timestamp display |
| `EventId`, `OrganisationId`, `UserId` | `@solvera/pace-core/types` | Branded ID types at feature boundary |
| `collectSourceErrors`, `composeResilientState`, `resolveWithFallback` | `@solvera/pace-core/resilience` | Composing loading state from multiple tracking data sources with partial-data fallback |

---

## 11. State management

1. React Query (`@tanstack/react-query`) manages all data fetches. `staleTime: 0` is applied to all tracking queries — tracking data must not be served from stale cache.
2. All tracking query keys are prefixed with `['ba16', selectedEvent.id]` to allow targeted cache invalidation on explicit refresh.
3. Explicit refresh (TR-PE-05) calls `queryClient.invalidateQueries({ queryKey: ['ba16', selectedEvent.id] })` and re-fetches all sections.
4. Step-1 scan-point data (the `base_scan_point` result set for the event) is shared across all tab derivations via a single React Query query and is not re-fetched separately per tab.
5. The last-updated timestamp is stored in component state (not React Query cache) and updated on each successful full refresh completion.
6. Participant search results in the Participant History tab are managed in local component state with a 200ms debounce on the search `Input`.

---

## 12. Navigation and routing

1. **Route:** `/scanning/tracking` — owned exclusively by BA16.
2. **Entry point:** a `Button variant="default"` labelled "View Tracking Dashboard" in BA12's `/scanning` admin hub calls `navigate('/scanning/tracking')`. No sidebar navigation entry is added for BA16.
3. **Back navigation:** the page renders a `Button variant="ghost"` or breadcrumb link "Back to scanning setup" in the page heading block that calls `navigate('/scanning')`.
4. **No sub-routes:** BA16 owns only the single static path `/scanning/tracking`. No parameterised sub-routes are defined.
5. **Route conflict check:** `/scanning/tracking` must be declared before `/scanning/:scanPointId` in the route configuration. React Router matches static segments before parameterised ones when routes are ordered this way. Declaring them in reverse order would cause `/scanning/tracking` to be matched as a `scanPointId` value.

---

## 13. Toasts and feedback

1. **Refresh failure:** `toast variant="destructive"` with the normalised error message from `normalizeSupabaseError`. The existing data remains visible.
2. **Query cap reached:** inline `Alert variant="default"` (not a toast) within the affected tab section. Text: "Result set capped at 500 rows. Some data may be omitted. Consider narrowing the event scope." See TR-ER-06.
3. **Data load error (per section):** `Alert variant="destructive"` with normalised error and a "Retry" `Button`. Not a toast — errors are shown inline in the affected section.
4. No success toast is shown for page load or refresh — successful refresh is communicated by the updated last-updated timestamp.

---

## 14. Accessibility

1. The three headline tiles (SP-HT-07) have `role="status"` and `aria-label` attributes naming the metric and value (e.g. "On-site: 42 participants").
2. The `Tabs` component from pace-core2 implements ARIA tab pattern (`role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`). No additional ARIA attributes are needed on `TabsTrigger` or `TabsContent`.
3. Tab navigation is fully keyboard-accessible: arrow keys move between tabs, Enter/Space activates a tab.
4. The participant search `Input` in the Participant History tab has a visible `label="Search participant"` — not a placeholder-only label.
5. Participant history `DataTable` rows with `validation_result = 'upload_conflict'` have an accessible `aria-label` on the result badge: "Upload conflict — see participant history for details".
6. Group expand/collapse controls (SP-OD-03, AT-PC-03, TP-PC-03) use `aria-expanded` to communicate collapsed/expanded state. The control element is a `button` with descriptive `aria-label` text: "Expand {scan point name} — {count} participants".
7. All interactive elements meet the 44px minimum touch target height for mobile-optimised use.
8. Colour is not used as the sole differentiator between validation result states — badge text labels accompany all badge colours.

---

## 15. Build prerequisites

All BA16 tables are live in dev-db (`rkytnffgmwnnmewevqgp`):

- `base_scan_event` — live; `validation_result` / `validation_reason` two-column split confirmed deployed
- `base_scan_point` — live
- `base_application` — live
- `core_member_card` — live (TEAM-owned)
- `core_person`, `core_member` — live (TEAM-owned)

**RLS prerequisite:** The `base_scan_event` SELECT RLS policy using `check_rbac_permission_with_context('read:page.scanning', 'scanning', ...)` specified in BA12 §7.1 must be deployed and confirmed on dev-db before BA16's tracking read surface can be built and tested end-to-end. BA16 does not define or deploy this policy.

No new schema changes, RPCs, RLS policies, or Edge functions are introduced by BA16.

---

## 16. Do not

- Do not write to any table. No INSERT, UPDATE, or DELETE is permitted from any BA16 code path.
- Do not use nested PostgREST `.eq('scan_point.event_id', ...)` filters on `base_scan_event`. Use the two-step query pattern exclusively (BR-TS-01).
- Do not load more than 500 rows per section client-side. Apply `.limit(500)` to every `base_scan_event` step-2 query (BR-QC-01).
- Do not render a `Tooltip` component — this component is a confirmed gap in pace-core2. Use always-visible `<p>` text or `title` attributes for supplementary labelling.
- Do not compare scan events against `base_activity_booking`, `trac_itinerary_assignment`, or any other booking or assignment table. BA16 is pure scan data derived from `base_scan_event` and `base_scan_point` only.
- Do not include a data export or download feature. BA15 owns all scan-event reporting and CSV/PDF export.
- Do not count rejected-only participants in any headline tile. Participants with no `accepted` or `accepted_override` scan events are excluded from on-site, off-site, and never-scanned counts (BR-PS-04).
- Do not add a sidebar navigation entry for `/scanning/tracking`. Navigation entry is via BA12's "View Tracking Dashboard" button only.
- Do not implement real-time WebSocket subscriptions or Supabase Realtime channels. Data is refreshed on explicit operator action only.
- Do not render a fourth "Rejected-only" headline tile. Rejected-only participants are visible exclusively in Participant History.
- Do not render any filter form controls (Select, Input for context/unit/subcamp filtering). Drill-down navigation is the sole filtering mechanism at MVP (Q-D3 resolution).
- Do not show `upload_conflict` rows in on-site, off-site, or never-scanned headline tile calculations. These rows have no accepted/accepted_override status and are excluded from presence-state derivation.

---

## 17. Acceptance criteria

- **AC-01:** Given an approved participant with an accepted site-in scan (`validation_result = 'accepted'` at a `context_type = 'site'` scan point with `direction = 'in'`), when the Site Presence tab loads, then that participant is counted in the On-site tile.
- **AC-02:** Given an approved participant with zero `base_scan_event` rows for any scan point in the event, when the Site Presence tab loads, then that participant is counted in the Never Scanned tile.
- **AC-03:** Given an approved participant whose only `base_scan_event` rows have `validation_result = 'rejected'`, when the Site Presence tab loads, then that participant does not appear in any headline tile count.
- **AC-04:** Given an off-site participant whose last accepted scan at a non-site scan point is at "Archery Range (context_type = 'activity')", when the off-site drill-down is viewed, then that participant appears in the "Archery Range (Activity)" location group.
- **AC-05:** Given the event has activity scan points with accepted scans, when the Activity tab loads, then each activity scan point appears with a count of accepted scans and a direction badge.
- **AC-06:** Given the event has transport scan points with accepted scans, when the Transport tab loads, then each transport scan point appears with a count of accepted scans and a direction badge.
- **AC-07:** Given a participant has `base_scan_event` rows including `upload_conflict` rows, when their history is viewed in the Participant History tab, then all rows including `upload_conflict` rows are shown in the history DataTable.
- **AC-08:** Given a `base_scan_event` row with `validation_result = 'upload_conflict'`, when it appears in the Participant History DataTable, then the Result cell shows a warning `Badge` labelled "Upload conflict".
- **AC-09:** Given the operator presses "Refresh", then all tracking data sections re-fetch from Supabase, the last-updated timestamp updates on success, and a destructive toast appears if the re-fetch fails.
- **AC-10:** Given an unauthenticated user or a user without `read:page.scanning` navigates to `/scanning/tracking`, then `AccessDenied` is rendered and no tracking data or participant information is exposed.
- **AC-11:** Given no event is selected, when `/scanning/tracking` is accessed, then the blocking "No event selected" Card is shown and no data fetches run.
- **AC-12:** Given a `base_scan_event` result set for a section reaches the 500-row limit, then an informational Alert is shown in that section notifying the operator that the result set has been capped.
- **AC-13:** Given the operator clicks a location group in the Site Presence off-site breakdown, then the group expands to reveal individual participant rows with names and last-scan timestamps.
- **AC-14:** Given the operator types at least 2 characters in the Participant History search field, then a dropdown of matching participants appears. Selecting a participant loads their chronological scan history.

---

**Authoring references:** `docs/requirements/BA12-scanning-setup-requirements.md` (§7.1 two-step query pattern and `base_scan_event` RLS spec); `docs/requirements/BA13-scanning-runtime-validation-requirements.md` (§7.5 BA16 cross-slice provision); `docs/requirements/BA14-scanning-sync-reconciliation-requirements.md` (§6 BR-IO-02 immutable events and §7.3 conflict data contract).
