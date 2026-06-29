# BA13 — Scanning Runtime and Validation

## Slice metadata

- Status: Implemented in BASE (formal §15 sign-off / QA pack execution pending)
- Depends on: BA06 (approved application states), BA11 (activity booking oversight contracts), BA12 (scan-point setup and identity contracts)
- Backend impact: Schema changes required — `base_scan_point`, `base_activity_booking`, `trac_itinerary_assignment` are forward spec and not yet in dev-db. `base_scan_event` and `core_member_card` are live in dev-db (`rkytnffgmwnnmewevqgp`). `validation_result` / `validation_reason` two-column schema split is confirmed deployed. IndexedDB queue structure is client-local; no backend migration needed for queue itself.
- Frontend impact: UI — `/scanning/:scanPointId` dedicated operator runtime surface

---

## 2. Overview

BA13 delivers the live operator scanning runtime at `/scanning/:scanPointId`. This is the dedicated on-ground surface an operator uses when physically scanning participant cards at an event. It is not an admin surface — it is a speed-optimised, single-purpose runtime designed for use on a handheld tablet or kiosk device.

The route reads the scan point identified by the URL parameter, displays its identity and event context in a persistent header, accepts card input from a USB or Bluetooth HID scanner (which emits decoded card identifiers as keystrokes), performs local validation against eligibility data, writes the outcome to a local IndexedDB queue, and presents an immediate result to the operator. BA14's sync worker handles flushing queued events to Supabase.

BA13 also surfaces a manual scan flow (for cases where a card cannot be read) and an override flow (for allowed rejection classes). All scan decisions are immediately visible, auditable, and immutable — no scan event may be edited after it is written.

---

## 3. What this slice delivers

### Purpose

Event operators need an unambiguous, fast scanning surface that processes card reads and produces an immediate result with no required navigation away from the scan point. Operators at physical checkpoints need to know within seconds whether a participant is accepted or rejected, and why — and have a clear, friction-appropriate path to override or manually add a participant when operationally justified.

### Surfaces

- **`/scanning/:scanPointId`** — the dedicated live scanning runtime. Wraps the full viewport in a minimal operator shell (no sidebar, no standard `PaceAppLayout`). Contains: a persistent top bar showing scan-point identity and event context; the primary scan `Input`; the result panel; and access to the manual scan flow.

### Boundaries

- `/scanning` (scan-point admin hub) belongs to BA12. BA12 navigates to BA13 via `navigate('/scanning/:scanPointId')`.
- Sync/reconciliation, upload retry, idempotency, and conflict persistence belong to BA14. BA13 writes to the local IndexedDB queue only; BA14's sync worker flushes the queue to `base_scan_event`.
- The tracking dashboard at `/scanning/tracking` belongs to BA16.
- Card issue, deactivation, and replacement workflows belong to TEAM. BA13 reads `core_member_card.card_identifier` and `core_member_card.is_active` for lookup only.
- Device registry is excluded from MVP.
- The IndexedDB queue structure is BA13-owned. BA14 owns the flush logic and reads from the queue.

### Architectural posture

- The route renders inside the authenticated `ProtectedRoute` but does **not** use `PaceAppLayout`. A slim custom header replaces the standard shell header and sidebar.
- > **Route read access:** Enforced by the app authenticated shell / PaceAppLayout `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). The page component must not wrap content in an outer `PagePermissionGuard operation="read"` unless this slice explicitly requires a **scoped read** override (`scope={{ organisationId, eventId, appId }}`).
- No additional permission is required beyond `read:page.scanning-runtime` for route access once registered in [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts).
- All reads use **`useSecureSupabase()`** from `@solvera/pace-core/rbac`. No service-role client in route code.
- BA13 has no authenticated INSERT permission on `base_scan_event`. BA13 writes to the local IndexedDB queue only. BA14's sync worker holds the service_role INSERT path to `base_scan_event`.
- The IndexedDB queue is a BA13-owned client-local data structure. It stores pending scan events before BA14 flushes them.
- Eligibility reads resolve in order: (1) offline manifest downloaded by BA12, (2) live Supabase read via `useSecureSupabase()` when no manifest entry matches (online only). When offline and no manifest entry exists, the scan is treated as a lookup failure and produces the appropriate rejection class.
- Offline manifests are stored by BA12's "Download [Type] Manifest" button in a dedicated IndexedDB database named `ba12_manifests`, object store `manifests`, keyed by `{ event_id, manifest_type }`. The download button stores to this IDB store first, then triggers a browser file download as a backup export. BA13 reads from `ba12_manifests` at the keyed path for the relevant `manifest_type` (site, activity, transport, or meal) matching `selectedEvent.id`. If no entry exists in `ba12_manifests` for the relevant key, the offline manifest is unavailable and BA13 falls back to live Supabase reads.
- Event context is resolved via **`useEvents()`** — `selectedEvent.id` and `selectedEvent.name`.
- `auth.uid()` is required for `override_by` on all override and manual scan entries. Resolved via **`useUnifiedAuth()`**.
- Toast provider is mounted by the BA00 app shell. BA13 imports `toast` at module level; no per-slice provider mounting.

### Page-level guards and evaluation ordering for `/scanning/:scanPointId`

1. > **Route read access:** Enforced by the app authenticated shell / PaceAppLayout `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). The page component must not wrap content in an outer `PagePermissionGuard operation="read"` unless this slice explicitly requires a **scoped read** override (`scope={{ organisationId, eventId, appId }}`).

2. **Route read access** is enforced by the authenticated shell / `PaceAppLayout` `routeAccessDenied` and [`base-route-registry.ts`](../../src/features/navigation/base-route-registry.ts). If access is denied, `AccessDenied` is rendered in the shell main region. The remaining states below are only evaluated after route access is granted.
2. If the guard is loading (auth client not yet settled), the guard renders `null`. A null Supabase client (transient auth initialisation) renders a centred `LoadingSpinner` in the main content region.
3. If the guard permits and the `scanPointId` URL parameter does not resolve to any `base_scan_point` row accessible to the authenticated user, the **scan-point not found** error state is rendered. The scan `Input` is not rendered. See §4 item RT-EX-01.
4. If the guard permits, the `scanPointId` resolves to a row, but `is_active = false`, the **inactive scan point** warning state is rendered. The scan `Input` is not rendered. See §4 item RT-EX-02.
5. If the guard permits, the `scanPointId` resolves to an active row, and event context is loaded, the runtime surface renders fully.

---

## 4. Functional specification

Prefix legend: **`RT`** runtime page-level, **`SC`** scan input and result, **`OV`** override flow, **`MS`** manual scan flow.

### `/scanning/:scanPointId` — page entry

1. **RT-PE-01 —** Navigating to `/scanning/:scanPointId` does not require any query parameters beyond the path param. The page resolves the scan point from the `scanPointId` URL param via a single-row-by-id `base_scan_point` query. RLS resolves `organisation_id` and `event_id` from the row itself; no client-side `event_id` filter is required on the by-id read.
2. **RT-PE-02 —** On successful load, the top bar renders `scan_point.name` (as stored in the database), the event name from `useEvents().selectedEvent.name`, and a direction badge. All three are always visible and are never hidden during scan operations.
3. **RT-PE-03 —** On load, the scan `Input` is focused automatically so that the first card scan requires no manual interaction.

### `/scanning/:scanPointId` — loading state

4. **RT-LS-01 —** While the `base_scan_point` row is loading, a centred `LoadingSpinner` is displayed in the main content region. The top bar is not yet rendered; no scan `Input` is shown.

### `/scanning/:scanPointId` — exception states (pre-runtime)

5. **RT-EX-01 — Scan point not found:** When the `scanPointId` does not resolve (no row returned, or RLS denies the read), a full-width `Alert variant="destructive"` is displayed with `AlertTitle` "Scan point not found" and `AlertDescription` "This scan point could not be loaded. It may have been removed or you may not have permission to access it." Below the `AlertDescription` within the same `Alert`, a `Button variant="outline"` "Back to scanning setup" navigates to `/scanning`. No scan `Input` is rendered.
6. **RT-EX-02 — Inactive scan point:** When the resolved `base_scan_point` row has `is_active = false`, a full-width `Alert variant="destructive"` is displayed with `AlertTitle` "Scan point inactive" and `AlertDescription` "Scan point inactive — this scan point has been deactivated and cannot accept scans." Below the `AlertDescription` within the same `Alert`, a `Button variant="outline"` "Back to scanning setup" navigates to `/scanning`. No scan `Input` is rendered.

### `/scanning/:scanPointId` — scan input and result cycle

7. **SC-SI-01 —** The primary scan input is a standard `Input` field labelled "Scan card" with placeholder "Awaiting card scan…". The field is focused at all times when the runtime surface is active and no dialog is open. HID scanners (USB or Bluetooth keyboard-wedge devices) deliver the decoded card identifier as keystrokes, followed by a carriage-return character that triggers submission.
8. **SC-SI-02 —** When the `Input` receives a carriage-return (or equivalent submission signal), the value is captured as `card_identifier`, `scanned_at` is recorded as `Date.now()`, and local validation runs immediately per BR-CV-01.
9. **SC-SI-03 —** While local validation is running, the `Input` is `disabled` and a `LoadingSpinner` is displayed inline within the result panel area. The top bar identity display remains visible throughout.
10. **SC-SI-04 —** When validation completes, the result panel replaces the spinner with the outcome display per SC-RP-01.
11. **SC-SI-05 —** After an accepted result auto-clears (3 seconds), the `Input` value is cleared, the result panel is cleared, and focus returns to the `Input` for the next scan.
12. **SC-SI-06 —** After a rejected result, the `Input` is `disabled` until the operator dismisses the rejection (presses the "Dismiss" button in the result panel). On dismiss, the `Input` value is cleared, the result panel is cleared, and focus returns to the `Input`.
13. **SC-SI-07 —** Each scan outcome is written to the local IndexedDB queue immediately after local validation, whether online or offline. There is no try-live-first code path. The queue write happens on every scan.
14. **SC-SI-08 — IndexedDB write failure:** If the IndexedDB `put()` call throws (e.g. `QuotaExceededError`, `DOMException`), the result panel does **not** show a scan outcome. Instead, a `toast` with `variant="destructive"` fires: "Scan could not be saved. Please try again." The scan `Input` is immediately re-enabled and focused. No queue entry is written. The failed write is not retried automatically — the operator must re-scan.

### `/scanning/:scanPointId` — result panel

14. **SC-RP-01 —** The result panel displays the outcome of the most recent scan. The panel is cleared either automatically (accepted, after 3 seconds) or on explicit operator dismiss (rejected, override-accepted). The top bar identity display is always visible; the result panel is below the scan `Input`.
15. **SC-RP-02 — Accepted result:** The panel shows a `Badge variant="solid-main-normal"` "Accepted" and the participant name resolved from the `core_member_card` lookup joined to the event eligibility data. Auto-clears after 3 seconds.
16. **SC-RP-03 — Rejected result:** The panel shows a `Badge` per BR-RB-01 with the rejection class label, a human-readable description of the rejection reason, and a `Button variant="outline"` "Dismiss" to re-enable the `Input`. Where the rejection class is overridable (per BR-OV-01), an additional `Button variant="default"` "Override" is shown alongside the Dismiss button. Where the rejection class is not overridable, no Override button is shown.
17. **SC-RP-04 — Override-accepted result:** After an override is confirmed, the panel replaces the rejected state with a `Badge variant="solid-acc-normal"` "Accepted (override)". Auto-clears after 3 seconds.
18. **SC-RP-05 —** The result panel does not render when the runtime is in the idle (awaiting scan) state.

### `/scanning/:scanPointId` — override flow

19. **OV-PA-01 —** Pressing "Override" on an overridable rejection opens a controlled `Dialog` with `DialogTitle` "Override scan result".
20. **OV-PA-02 —** The `DialogBody` shows the rejection reason read-only (as plain text), followed by a `Textarea` labelled "Notes (optional)" with placeholder "Add a note for this scan." Maximum 500 characters. Character count is not displayed unless the limit is approached (within 50 characters remaining), at which point a counter "X / 500" appears below the field.
21. **OV-PA-03 —** `DialogFooter` contains `Button variant="default"` "Confirm override" and `Button variant="outline"` "Cancel".
22. **OV-PA-04 —** Pressing "Cancel" closes the dialog and returns focus to the rejected result panel (the Dismiss and Override buttons remain visible; the rejection is not resolved).
23. **OV-PA-05 —** Pressing "Confirm override" records an override entry in the local IndexedDB queue: `validation_result = 'accepted_override'`, `override_by = auth.uid()`, `validation_reason` = that rejected entry's rejection reason string (retained), `notes` = textarea value or null if empty. The dialog closes and the result panel transitions to the override-accepted state (SC-RP-04). The override is a new queue entry; it does not mutate the rejected entry that prompted it.
24. **OV-PA-06 —** Override is a permission-conditional action. The Override button is only rendered when the authenticated user has `update:page.scanning`. When the user lacks this permission, the Dismiss button is still shown but the Override button is absent — even for overridable rejection classes.

### `/scanning/:scanPointId` — manual scan flow

25. **MS-PA-01 —** A `Button variant="outline"` "Manual scan" is permanently visible below the scan `Input` area (outside the result panel). It is only rendered when the authenticated user has `update:page.scanning`. Pressing it opens the manual scan dialog.
26. **MS-PA-02 —** The manual scan dialog is a controlled `Dialog` with `DialogTitle` "Manual scan".
27. **MS-PA-03 —** The `DialogBody` contains a name-search `Input` labelled "Participant name" with placeholder "Search by name…". As the operator types at least 2 characters, a dropdown list appears below the input showing matching `base_application` rows for `selectedEvent.id` where `status = 'approved'`. Search is server-side: `supabase.from('base_application').select('id, person_id, core_person!inner(preferred_name, first_name, last_name)').eq('event_id', selectedEvent.id).eq('organisation_id', selectedOrganisation.id).eq('status', 'approved').ilike('core_person.preferred_name', \`%${searchTerm}%\`)` — with a fallback `or` clause covering `first_name` and `last_name`. Minimum 2 characters before search fires. Results capped at 20. Results are updated on each keystroke with a 200ms debounce.
28. **MS-PA-04 —** Selecting a participant from the dropdown populates a read-only display of the participant name below the search input and dismisses the dropdown. The operator may clear the selection using the `Button variant="ghost" size="icon"` × button beside the selected participant display — this resets the selected participant and clears the name-search `Input`.
29. **MS-PA-05 —** Below the participant selection area, a `Textarea` labelled "Notes (optional)" with placeholder "Add a note for this scan." Maximum 500 characters.
30. **MS-PA-06 —** `DialogFooter` contains `Button variant="default"` "Record manual scan" (disabled until a participant is selected) and `Button variant="outline"` "Cancel".
31. **MS-PA-07 —** Pressing "Cancel" closes the dialog without recording anything and returns focus to the scan `Input`.
32. **MS-PA-08 —** Pressing "Record manual scan" (with a participant selected) writes a manual scan entry to the local IndexedDB queue: `card_identifier = null` (no card read occurred), `validation_result = 'accepted_override'`, `override_by = auth.uid()`, `notes` = textarea value or null if empty. The dialog closes and the result panel displays the override-accepted state (SC-RP-04) attributed to the selected participant name. Auto-clears after 3 seconds.
33. **MS-PA-09 —** The manual scan flow is visually separated from the fast-path scan input. It must not interfere with rapid card scanning — the manual scan dialog is only opened by explicit operator action.

### `/scanning/:scanPointId` — permission-conditional rendering

34. **RT-PERM-01 —** Users without `read:page.scanning-runtime` see `AccessDenied`. No scanning content is shown.
35. **RT-PERM-02 —** Users with `read:page.scanning-runtime` but without `update:page.scanning` see no Override button in the result panel and no "Manual scan" button.
36. **RT-PERM-03 —** Scan-point identity in the top bar, the scan `Input`, and the result panel (including Dismiss) are visible to any user who passes the page guard.

### `/scanning/:scanPointId` — navigation

37. **RT-NAV-01 —** The top bar renders a `Button variant="ghost"` or text link "Back to scanning setup" that navigates to `/scanning`. This is always visible in the top bar regardless of scan state.
38. **RT-NAV-02 —** The runtime surface does not link to any other route during active scanning. The only navigation affordances are "Back to scanning setup" in the top bar and the "Back to scanning setup" button in the exception state Alerts.

---

## 5. Visual specification

- Prototype reference: `pace-prototype/apps/pace-base/pages/UnitsActivitiesScanPage.jsx` (`ScanRuntimePage`).

### Prototype layout summary

1. **Standard app shell** — `ScanRuntimePage` renders inside **`PaceHeader` / event nav** (not outside the sidebar).
2. **PageHeader** — breadcrumb through Scanning; scan point name as title; **Simulate scan** + **Back to scan points**.
3. **Two-column scan stage** — main **scanner view** (QR target animation, last scan status panel) + aside **Last 8 scans** (time, name, unit).
4. Empty recent list shows hint to simulate scan.

### Route map

| Prototype | BASE |
|---|---|
| `#/events/:code/scanning/:point` | `/scanning/:scanPointId` |

### Implementation delta (pass 2)

- Production registers runtime **outside `AuthenticatedShell` sidebar** with a **minimal top bar** (not prototype PageHeader).
- Production replaces prototype **QR target animation** with **HID scan `Input`** + result panel; **"Simulate scan"** is prototype-only.
- Prototype **"Last 8 scans" aside** is **not** carried into production runtime; event-wide history lives on **BA16 `/scanning/tracking`**.
- **BA14 sync health:** optional **queue-status indicator / toast** in the **top bar** (BA14 Visual specification) — not in prototype.

### Layout — `/scanning/:scanPointId`

- The route renders **without** the standard `PaceAppLayout` sidebar. The viewport is divided into two rows: (1) a **top bar** (always visible, fixed height), and (2) a **main content area** that scrolls if content overflows.
- No sidebar, no secondary navigation. This is a full-viewport single-panel surface.
- On desktop and tablet the main content area is centred with a max-width of `480px` and `px-4 py-6` padding. On mobile viewports (below `sm` breakpoint) content spans full width with `px-4 py-4` padding.
- Dialogs mount via `DialogPortal` over the full viewport at all breakpoints. `DialogContent` max-width `sm` (≈480px) on desktop; full viewport width with standard side padding on mobile.
- The surface is designed for **one-handed tablet use at standing height** — all primary interactive elements are large enough for touch targeting (minimum 44px height) and grouped in the lower two-thirds of the viewport.

### Components — top bar

A header bar with `bg-card border-b border-border` styling, `h-12` (48px) fixed height, `px-4` horizontal padding, full viewport width. It contains three elements in a single horizontal row:

- **Left:** `Button variant="ghost" size="sm"` or `<a>` "Back to scanning setup" → `/scanning`. A `ChevronLeft` icon from `@solvera/pace-core/icons` precedes the text (BASE icons barrel does not export `ArrowLeft`; `ChevronLeft` is the approved substitute). This is always rendered.
- **Centre:** Scan-point identity block (see below) — horizontally centred via `flex-1 flex justify-center`.
- **Right:** when local queue has `failed` entries for this scan point, show BA14 **"Upload failed"** badge or compact sync status (see BA14 QD-BD-*); otherwise right placeholder `<div aria-hidden='true'>` with `w-24` fixed width matching the approximate rendered width of the back-navigation button.

**Scan-point identity block:** Three elements stacked vertically and centred:
1. **Scan point name:** plain text `text-sm font-semibold text-foreground`. Displays `scan_point.name` as stored in the database (the `name` column on `base_scan_point`).
2. **Event name:** `text-xs text-muted-foreground`. Text: `selectedEvent.name`.
3. **Direction badge:** `Badge variant="solid-sec-muted"` with label "In", "Out", or "Both" per the scan point's `direction` field.

### Components — main content area

The main content area stacks the following elements vertically with `gap-6` between them:

**Scan Input block:**
- `Card` (`CardContent` only — no `CardHeader`) containing:
  - `Input` field: `name="cardInput"` `label="Scan card"` `placeholder="Awaiting card scan…"` `text-base h-12` full-width. The `text-base h-12` sizing provides a large tap target suited to standing-height kiosk operation. When `disabled`, the field renders with the pace-core disabled visual state (reduced opacity, not editable). The field captures keystrokes from HID scanners without any additional UI configuration.

**Result panel:**
- A second `Card` that is **not rendered** in the idle state (no current result).
- Rendered when a result is available (scan has been processed):
  - **Header row:** the outcome `Badge` (per BR-RB-01) on the left; participant name on the right. Layout: `flex items-center justify-between gap-2`. Participant name is `truncate flex-1 min-w-0 text-sm text-foreground`.
  - **Body:** human-readable description of the outcome (1–2 lines of `text-sm text-muted-foreground`):
    - Accepted: "Card accepted. Participant entry recorded."
    - `rejected_card_not_recognised`: "Card not recognised. No PACE identity matches this card identifier."
    - `rejected_card_not_valid`: "Card inactive. This card exists but has been deactivated."
    - `rejected_booking_not_valid`: "Booking not valid. No confirmed booking for this participant at this scan point."
    - `rejected_duplicate_scan`: "Duplicate scan. This card has already been scanned at this point."
    - `rejected_registration_not_valid`: "Registration not valid. No approved registration found for this participant at this event."
    - Override-accepted: "Override recorded. Participant entry accepted by override."
  - **Footer:** `scanned_at` formatted with `formatInTimeZone(scannedAt, selectedEvent.timezone ?? user timezone, 'd MMM yyyy h:mm a')` from `@solvera/pace-core/utils` (equivalent intent to wall-clock display in the event timezone). Shown for all result states (accepted, rejected, override-accepted).
  - **Override-accepted header row:** shows `Badge variant='solid-acc-normal'` "Accepted (override)" on the left; participant name on the right. Same header row layout (`flex items-center justify-between gap-2`) as accepted.
  - **Action row** (visible only on rejected results, not on accepted or override-accepted):
    - `Button variant="outline"` "Dismiss" — always rendered on rejection.
    - `Button variant="default"` "Override" — rendered only when the rejection class is overridable (per BR-OV-01) AND the user has `update:page.scanning`.

**Manual scan button:**
- `Button variant="outline"` "Manual scan" — rendered below the result panel block (or below the scan input block when the result panel is not shown). Rendered only when the user has `update:page.scanning`. Full-width on mobile; auto width on desktop/tablet.

### Components — override Dialog

- `Dialog` controlled via `open`/`onOpenChange`. Mounted via `DialogPortal`.
- `DialogHeader`: `DialogTitle` "Override scan result".
- `DialogBody`:
  - Read-only rejection reason: `p className="text-sm text-muted-foreground"` with the rejection class description text.
  - `Textarea` `name="notes"` `label="Notes (optional)"` `placeholder="Add a note for this scan."` `maxLength={500}`. Full-width. Character counter `"X / 500"` rendered as `p className="text-xs text-muted-foreground text-right mt-1"` — only shown when fewer than 50 characters remain. On open, focus lands on this `Textarea`.
- `DialogFooter`: `Button variant="default"` "Confirm override" + `Button variant="outline"` "Cancel".

### Components — manual scan Dialog

- `Dialog` controlled via `open`/`onOpenChange`. Mounted via `DialogPortal`.
- `DialogHeader`: `DialogTitle` "Manual scan".
- `DialogBody`:
  - Name-search `Input` `name="participantSearch"` `label="Participant name"` `placeholder="Search by name…"`. Full-width.
  - Dropdown results list: absolutely-positioned below the `Input`, `bg-card border border-border rounded-md shadow-lg z-50`, max-height `240px` with `overflow-y-auto`. Each result row is a `button` element with `px-3 py-2 text-sm text-foreground hover:bg-accent` — full width. When no results match, a single row reads "No participants found." in `text-muted-foreground`. Before the operator has typed anything, the results dropdown is hidden. It appears after the operator types at least 2 characters.
  - Selected participant display: `p className="text-sm font-medium text-foreground mt-2"` showing the selected participant's name when a selection has been made. A `Button variant="ghost" size="icon"` × button beside the selected participant display resets the selection and clears the name-search `Input`.
  - `Textarea` `name="notes"` `label="Notes (optional)"` `placeholder="Add a note for this scan."` `maxLength={500}`. Full-width. Same character counter as override dialog.
- `DialogFooter`: `Button variant="default"` "Record manual scan" (`disabled` until a participant is selected) + `Button variant="outline"` "Cancel".

### States

- **Loading (guard loading):** `null` per `PagePermissionGuard` default; `LoadingSpinner` centred in viewport when Supabase client is null.
- **Loading (scan point fetch):** centred `LoadingSpinner` in main content area; top bar not yet rendered; no scan `Input` shown.
- **Exception — scan point not found (RT-EX-01):** full-width `Alert variant="destructive"`. `AlertTitle` "Scan point not found". `AlertDescription` "This scan point could not be loaded. It may have been removed or you may not have permission to access it." `Button variant="outline"` "Back to scanning setup" below the description within the `Alert`.
- **Exception — inactive scan point (RT-EX-02):** full-width `Alert variant="destructive"`. `AlertTitle` "Scan point inactive". `AlertDescription` "Scan point inactive — this scan point has been deactivated and cannot accept scans." `Button variant="outline"` "Back to scanning setup" below the description within the `Alert`.
- **Idle (awaiting scan):** scan `Input` focused and enabled, result panel absent. The Card does not render at all in the idle state — it appears only when a validation is in progress or a result is available.
- **Validation in progress:** While local validation is running (typically < 100ms but variable when live Supabase reads are required), the result panel Card renders with `CardContent` only, showing `LoadingSpinner` centred. The `Input` is disabled during validation. If validation completes in under 50ms, the spinner is not shown (result renders directly).
- **Result — accepted:** result panel shows `Badge variant="solid-main-normal"` "Accepted" + participant name + accepted body text. Auto-clears after 3 seconds.
- **Result — rejected (overridable):** result panel shows `Badge` per BR-RB-01 + rejection body text + Dismiss button + Override button. Scan `Input` disabled.
- **Result — rejected (non-overridable):** result panel shows `Badge` per BR-RB-01 + rejection body text + Dismiss button only. Scan `Input` disabled.
- **Result — override-accepted:** result panel shows `Badge variant="solid-acc-normal"` "Accepted (override)" + participant name + override body text. Auto-clears after 3 seconds.
- **Access denied:** `AccessDenied` component from `@solvera/pace-core/rbac`.

### Interactions

- **HID scanner input:** the scan `Input` is focused and enabled in the idle state. HID keyboard-wedge scanners emit keystrokes that populate the `Input` value, followed by a carriage-return character that triggers `onSubmit`. No special configuration is needed on the `Input` beyond standard form submission handling.
- **Auto-clear (accepted / override-accepted):** a 3-second timer starts when an accepted or override-accepted result is displayed. On expiry, the result panel clears and the `Input` is re-focused.
- **Dismiss (rejected):** pressing "Dismiss" clears the result panel and re-focuses the `Input` immediately (no timer).
- **Override dialog:** opens over the result panel. Escape and backdrop click close the dialog without recording an override; focus returns to the "Override" button in the result panel.
- **Manual scan dialog:** opens over the main content area. Escape and backdrop click close the dialog without recording anything; focus returns to the "Manual scan" button.
- **`window.confirm` is not used anywhere in this slice.** All confirmation flows use pace-core `Dialog`.

### Permission-conditional rendering matrix

| Surface | Required permission | When denied |
|---------|---------------------|-------------|
| Entire `/scanning/:scanPointId` route | `read:page.scanning-runtime` | `AccessDenied` |
| Override button in result panel | `update:page.scanning` | Button absent (Dismiss still shown) |
| "Manual scan" button | `update:page.scanning` | Button absent |
| Override dialog open / confirm | `update:page.scanning` | Dialog cannot be reached (button absent) |
| Manual scan dialog open / confirm | `update:page.scanning` | Dialog cannot be reached (button absent) |

---

## 6. Business rules

### BR-VM-01 — Runtime-to-persistence vocabulary mapping

Six runtime outcome codes are used during local validation. Each maps to a `validation_result` + `validation_reason` pair that BA14 writes to `base_scan_event` when flushing the queue. The local IndexedDB queue entry carries both fields.

| Runtime outcome | `validation_result` written to queue | `validation_reason` written to queue |
|----------------|-------------------------------------|--------------------------------------|
| Accepted | `accepted` | `null` |
| Card not recognised | `rejected` | `card_not_recognised` |
| Card inactive | `rejected` | `card_not_valid` |
| Registration not valid | `rejected` | `registration_not_valid` |
| Booking not valid | `rejected` | `booking_not_valid` |
| Duplicate scan | `rejected` | `duplicate_scan` |
| Override-accepted (override flow or manual scan) | `accepted_override` | original `validation_reason` string if a prior rejection existed; `null` for manual scans |

Transport context validation failure maps to `validation_result = 'rejected'`, `validation_reason = 'booking_not_valid'`. No separate transport-specific validation_reason value is used in MVP.

`upload_conflict` is a value set by BA14's sync processing only. BA13 must never write `upload_conflict` to any queue entry or persisted field.

`pending_upload` is a transient `sync_status` value on the local queue entry only. It must never be written to `base_scan_event.validation_result` or any other persisted column.

### BR-CV-01 — Context-specific validation logic

Local validation runs synchronously after a card identifier is captured. The validation path branches on `base_scan_point.context_type`.

**Step 1 — Card lookup (all context types):**
Query the offline manifest (if available for the relevant context type) or live `core_member_card` for a row matching `card_identifier = <scanned_value>`. The lookup produces one of three outcomes:

- If a row is found AND `is_active = true` → proceed to Step 2 (eligibility check).
- If a row is found AND `is_active = false` → the outcome is `rejected` / `card_not_valid`. Validation stops; skip Steps 2–4.
- If no row is found → the outcome is `rejected` / `card_not_recognised`. Validation stops; skip Steps 2–4.

When resolving from the offline manifest, presence of a `card_identifier` entry in the manifest implies `is_active = true` at the time of manifest download. No separate `is_active` check is required when the manifest is the source. An absent manifest entry is treated as "no row found" → `rejected` / `card_not_recognised`.

**Step 2 — Eligibility check (varies by context type):**

| `context_type` | Valid condition | Rejection on failure |
|----------------|-----------------|----------------------|
| `site` | Approved `base_application` for `event_id` exists for the `person_id` resolved from the card row | `rejected` / `registration_not_valid` |
| `meal` | Approved `base_application` for `event_id` exists for the `person_id` resolved from the card row | `rejected` / `registration_not_valid` |
| `activity` | Confirmed `base_activity_booking` exists for `session_id = base_scan_point.resource_id` and the `person_id` resolved from the card row (via the `base_application` FK chain) | `rejected` / `booking_not_valid` |
| `transport` | Confirmed `trac_itinerary_assignment` exists for the transport leg identified by `base_scan_point.resource_id` and the `person_id` resolved from the card row | `rejected` / `booking_not_valid` |

**Step 3 — Duplicate scan check (all context types):**
After a successful eligibility check, query the local IndexedDB queue for any entry where `scan_point_id = current scan point` AND `card_identifier = <scanned_value>` AND `scanned_at > (Date.now() - dedup_window_ms)` AND `validation_result IN ('accepted', 'accepted_override')`. The default dedup window is 3600000ms (60 minutes). If a matching entry exists, the outcome is `rejected` / `duplicate_scan`.

Dedup query implementation: uses the `by_card_at_point` IDB index (keyPath: `[scan_point_id, card_identifier, scanned_at]`). The implementation opens a cursor on the index bounded by `[scan_point_id, card_identifier, Date.now() - dedup_window_ms]` to `[scan_point_id, card_identifier, Date.now()]`. Cursor results are filtered in JS for `validation_result IN ['accepted', 'accepted_override']`. This avoids a full table scan.

Dedup applies regardless of `sync_status`. Queue entries with `sync_status = 'failed'` are included in the dedup check — they represent real scans that occurred, even if not yet synced.

**Online vs offline eligibility reads:**
Eligibility data resolves in this priority order:
1. Offline manifest entry from `ba12_manifests` IndexedDB (key: `{ event_id, manifest_type }`) — used when available, online or offline. BA12's manifest download button writes to this store first; BA13 reads from it.
2. Live Supabase query via `useSecureSupabase()` — used when no entry exists in `ba12_manifests` for the relevant key and the device is online.
3. If offline and no `ba12_manifests` entry exists for the relevant key, the card lookup fails with `rejected` / `card_not_recognised` for card lookup failures, or the appropriate rejection class for eligibility failures where the manifest is present but the eligibility row is absent.

**Non-participant site/meal access:** Staff or coordinators who do not have an approved `base_application` row are not valid for site or meal scans. There is no online-only staff bypass in the scanning runtime — the site and meal manifests produced by BA12 contain only approved participants. Non-participant staff access via scanning is not supported in MVP.

### BR-OV-01 — Override permission by rejection class

Override is available only for specific rejection classes and only when the operator has `update:page.scanning`.

| Rejection class (`validation_reason`) | Override allowed? |
|---------------------------------------|-------------------|
| `card_not_recognised` | No — the scanned credential does not resolve to a known PACE identity |
| `card_not_valid` | Yes — operator can override an inactive card |
| `registration_not_valid` | Yes |
| `booking_not_valid` | Yes |
| `duplicate_scan` | No |

An override records a new queue entry (not a mutation of the prior rejected entry) with `validation_result = 'accepted_override'`, `override_by = auth.uid()`, `validation_reason` = that prior rejected entry's rejection reason string retained, and optional `notes`.

### BR-MS-01 — Manual scan contract

A manual scan is an explicit operator-authorised presence event that records a scan outcome without a physical card read.

- The operator selects a participant through the manual scan dialog's name-search flow. Silent record injection without an explicit operator selection is not permitted.
- The participant is identified by searching approved `base_application` rows for `selectedEvent.id` (status = 'approved'), matched by name.
- The resulting queue entry carries `validation_result = 'accepted_override'`, `override_by = auth.uid()`, `card_identifier = null` (no card read), and optional `notes`.
- `validation_reason` is `null` for manual scan entries (there was no prior rejection to record a reason from).
- The manual scan flow must not share the fast-path scan input. It is only accessible via the explicit "Manual scan" button.

### BR-IQ-01 — IndexedDB queue entry structure

The `ba13_scan_queue` IndexedDB database is opened with:

```
Database name: ba13_scan_queue
Version: 1
onupgradeneeded (version 1):
  Create object store 'scan_events' with keyPath: 'local_id'
  Create index 'by_scan_point': keyPath ['scan_point_id', 'sync_status']
  Create index 'by_card_at_point': keyPath ['scan_point_id', 'card_identifier', 'scanned_at']
```

The `by_card_at_point` index supports the dedup query (BR-CV-01 Step 3). The `by_scan_point` index supports BA14's flush query (reads all `pending` entries for a scan point).

Each queue entry is a BA13-owned local record stored in IndexedDB before BA14's sync worker flushes it. The queue entry shape is:

| Field | Type | Description |
|-------|------|-------------|
| `local_id` | string (UUID) | Client-generated UUID for this queue entry |
| `scan_point_id` | string (UUID) | From the URL param; identifies the `base_scan_point` |
| `card_identifier` | string or null | The decoded string captured from the HID scanner; null for manual scans |
| `scanned_at` | number | `Date.now()` at the moment of scan capture |
| `validation_result` | string | One of: `accepted`, `rejected`, `accepted_override` |
| `validation_reason` | string or null | Rejection reason string or null |
| `override_by` | string or null | `auth.uid()` when override or manual scan; null for standard accepted/rejected outcomes |
| `notes` | string or null | Operator notes; null if not entered |
| `device_id` | string or null | Session-scoped device identifier generated once per browser session via `crypto.randomUUID()`, stored in `sessionStorage` under key `ba13_device_id`. The same value is used for all scan events in the session. |
| `sync_status` | string | One of: `pending`, `syncing`, `synced`, `failed` |

BA13 creates entries with `sync_status = 'pending'`. BA14 updates `sync_status` as it flushes. BA13 does not modify `sync_status` after the initial write.

**Write failure handling:** If the IndexedDB `put()` call throws (e.g. `QuotaExceededError`, `DOMException`), the result panel does **not** show a scan outcome. Instead, a `toast` with `variant="destructive"` fires: "Scan could not be saved. Please try again." The scan `Input` is immediately re-enabled and focused. No queue entry is written. The failed write is not retried automatically — the operator must re-scan.

### BR-RB-01 — Result badge variants

| Outcome | `Badge` variant | Label |
|---------|-----------------|-------|
| Accepted | `solid-main-normal` | "Accepted" |
| Any rejected class | `solid-sec-muted` | Rejection class label (see table below) |
| Override-accepted | `solid-acc-normal` | "Accepted (override)" |

Rejection class labels for `Badge` display:

| `validation_reason` | Badge label |
|--------------------|-------------|
| `card_not_recognised` | "Card not recognised" |
| `card_not_valid` | "Card inactive" |
| `registration_not_valid` | "Registration not valid" |
| `booking_not_valid` | "Booking not valid" |
| `duplicate_scan` | "Duplicate scan" |

### BR-SC-01 — Scan-event write boundary

BA13 writes IndexedDB queue entries only. BA13 must not:

- Issue any INSERT, UPDATE, or DELETE against `base_scan_event` via the authenticated Supabase client or any other path.
- Write `validation_result = 'upload_conflict'` to any queue entry or persisted field.
- Encode `sync_status` in `base_scan_event` columns — `sync_status` is a queue-local field only.
- Modify or delete any queue entry after it has been written (other than BA14 updating `sync_status`).

BA14 is the sole actor that reads the queue and writes to `base_scan_event` via service_role INSERT.

---

## 7. API / Contract

### 7.1 Read contracts — `base_scan_point` by ID

BA13 reads a single `base_scan_point` row by `id` (the URL param). RLS resolves `organisation_id` and `event_id` from the row itself — no client-side `event_id` filter is required.

```
from('base_scan_point')
.select(`
  id,
  name,
  context_type,
  direction,
  resource_type,
  resource_id,
  is_active,
  event_id,
  organisation_id
`)
.eq('id', scanPointId)
.single()
```

RLS policy (forward spec, migration required — per BA12 §7.1):

```sql
-- SELECT (authenticated):
check_rbac_permission_with_context(
  'read:page.scanning-runtime', 'scanning-runtime',
  organisation_id, event_id::text, get_app_id('BASE')
)
```

No `event_id` filter is applied in the client query. The RLS policy enforces scope from the row's own `organisation_id` and `event_id`.

### 7.2 Read contracts — eligibility data

**Card lookup (step 1 of BR-CV-01):**

```
from('core_member_card')
.select('card_identifier, is_active, person_id')
.eq('card_identifier', scannedValue)
.single()
```

TEAM-owned; live in dev-db (`rkytnffgmwnnmewevqgp`). The query does NOT filter by `is_active` — both active and inactive rows are returned so that Step 1 can distinguish `card_not_recognised` (no row) from `card_not_valid` (row found but `is_active = false`). Read via `ba12_manifests` IndexedDB (key: `{ event_id, manifest_type: 'site' | 'activity' | 'transport' | 'meal' }`) when available, otherwise live Supabase query.

**Site / meal eligibility (step 2, site and meal context types):**

```
from('base_application')
.select('id, status, person_id, event_id')
.eq('person_id', personId)
.eq('event_id', selectedEvent.id)
.eq('status', 'approved')
.single()
```

**Activity eligibility (step 2, activity context type):**

```
from('base_activity_booking')
.select('id, status, session_id')
.eq('session_id', scanPoint.resource_id)
.eq('status', 'confirmed')
-- conceptual join path (PostgREST):
-- base_activity_booking!inner(
--   application_id,
--   base_application!inner(person_id),
--   base_activity_session!inner(id)
-- )
-- WHERE base_application.person_id = :personId
--   AND base_activity_session.id = :scanPoint.resource_id
--   AND status = 'confirmed'
```

Forward spec; not yet in dev-db.

**Transport eligibility (step 2, transport context type):**

```
from('trac_itinerary_assignment')
.select('id, person_id')
-- scoped to transport leg identified by scanPoint.resource_id
.eq('person_id', personId)
```

Forward spec; not yet in dev-db.

**Manual scan participant search:**

Search is server-side. Minimum 2 characters before search fires. Results capped at 20.

```
supabase
.from('base_application')
.select('id, person_id, core_person!inner(preferred_name, first_name, last_name)')
.eq('event_id', selectedEvent.id)
.eq('organisation_id', selectedOrganisation.id)
.eq('status', 'approved')
.ilike('core_person.preferred_name', `%${searchTerm}%`)
// with fallback or clause covering first_name and last_name
.limit(20)
```

### 7.3 Write contract — IndexedDB queue

BA13 writes to a BA13-owned IndexedDB database. The full open contract is:

```
Database name: ba13_scan_queue
Version: 1
onupgradeneeded (version 1):
  Create object store 'scan_events' with keyPath: 'local_id'
  Create index 'by_scan_point': keyPath ['scan_point_id', 'sync_status']
  Create index 'by_card_at_point': keyPath ['scan_point_id', 'card_identifier', 'scanned_at']
```

The `by_card_at_point` index supports the dedup query (BR-CV-01 Step 3). The `by_scan_point` index supports BA14's flush query (reads all `pending` entries for a scan point).

The queue write uses the browser's native IndexedDB API. No Supabase client is involved in the queue write path.

Queue write on every scan:

```ts
// Initialise device_id once per browser session
if (!sessionStorage.getItem('ba13_device_id')) {
  sessionStorage.setItem('ba13_device_id', crypto.randomUUID());
}
const device_id = sessionStorage.getItem('ba13_device_id');

const entry: ScanQueueEntry = {
  local_id: crypto.randomUUID(),
  scan_point_id: scanPointId,          // from URL param
  card_identifier: scannedValue,       // null for manual scans
  scanned_at: Date.now(),
  validation_result,                   // 'accepted' | 'rejected' | 'accepted_override'
  validation_reason,                   // string or null
  override_by,                         // auth.uid() or null
  notes,                               // string or null
  device_id,                           // from sessionStorage 'ba13_device_id'; same value for all events in session
  sync_status: 'pending',
};
await db.put('scan_events', entry);
```

BA14 is responsible for reading this queue and flushing entries to `base_scan_event` via service_role INSERT.

### 7.4 RLS / permission contracts

`base_scan_event` INSERT from authenticated client is DENIED. BA13 must never attempt an authenticated INSERT to `base_scan_event`. The full RLS contract is specified in BA12 §7.1.

`base_scan_point` SELECT RLS: confirmed to resolve `organisation_id` and `event_id` from the row itself for by-id reads. Per Q-PC3 resolution: no client-side `event_id` filter is required for single-row reads.

### 7.5 Cross-slice handoffs

| Direction | Slice | What is exchanged |
|-----------|-------|-------------------|
| Receives navigation from | **BA12** | `/scanning/:scanPointId` — `scanPointId` URL param; BA13 reads the scan point by this ID |
| Reads scan-point contract from | **BA12** | `BA12.scan_point.list` — `base_scan_point` column shape and RLS contract |
| Reads eligibility manifest from | **BA12** | `BA12.manifest.site.query`, `BA12.manifest.activity.query`, `BA12.manifest.meal.query` — downloaded JSON manifest as local eligibility reference |
| Provides queue to | **BA14** | BA13-owned IndexedDB queue (`ba13_scan_queue`) — BA14 reads this queue and flushes entries to `base_scan_event` |
| Reads event context from | **BA01** | `useEvents()` — `selectedEvent.id`, `selectedEvent.name` |
| Provides scan event contract to | **BA16** | `BA13.contract` — immutable `base_scan_event` rows with `validation_result` / `validation_reason` shape (after BA14 flush) |

### 7.6 Normative contract identifier

| Contract ID | Boundary |
|-------------|---------|
| `BA13.contract` | `base_scan_event` table contract — immutable scan events with `validation_result` / `validation_reason` shape. Rows are written by BA14's sync worker on BA13's behalf. Consumed by BA15 (reporting) and BA16 (tracking). |
| `BA13.queue.write` | BA13 IndexedDB queue write — every scan produces a `ScanQueueEntry` with `sync_status = 'pending'` |

---

## 8. Data and schema references

| Artefact | Role | Status |
|----------|------|--------|
| **`base_scan_point`** | Scan-point configuration and context; BA13 reads by `id` from URL param. Columns: `id uuid`, `name text` (NOT NULL), `context_type text`, `direction text`, `resource_type text?`, `resource_id uuid?`, `is_active bool`, `event_id varchar`, `organisation_id uuid` | Not in dev-db — forward contract per BA12 |
| **`base_scan_event`** | Immutable scan-event record written by BA14 on BA13's behalf. Columns: `id uuid`, `scan_point_id uuid`, `scan_card_id uuid` (NOT NULL — BA14 flush path resolves this), `member_id uuid` (NOT NULL — BA14 flush path resolves this), `validation_result text`, `validation_reason text?`, `scanned_at timestamptz`, `synced_at timestamptz?`, `override_by uuid?`, `notes text?`, `device_id text?` (BA14 populates from queue entry's `device_id` at flush time) | Live in dev-db (`rkytnffgmwnnmewevqgp`). `validation_result` / `validation_reason` two-column split confirmed deployed. `scan_card_id` and `member_id` are NOT NULL — BA14's flush path is responsible for resolving these from the queue entry; BA13 does not INSERT to `base_scan_event` directly. |
| **`core_member_card`** | Card lookup — `card_identifier`, `is_active`, `person_id`. TEAM-owned | Live in dev-db (`rkytnffgmwnnmewevqgp`) |
| **`base_application`** | Site / meal eligibility check (`status = 'approved'`); manual scan participant search | In dev-db — confirmed per platform-snapshot-2026-05-11 |
| **`base_activity_booking`** | Activity eligibility check (`status = 'confirmed'`, `session_id`) | Not in dev-db — forward contract per BA10/BA11 |
| **`trac_itinerary_assignment`** | Transport eligibility check | Not in dev-db — forward contract |
| **`core_person`** | Participant name for manual scan search and result panel display (`preferred_name`, `first_name`, `last_name`) | In dev-db |
| **IndexedDB `ba13_scan_queue`** | BA13-owned client-local queue; not a Supabase table; no migration needed | Client-local — implemented as BA13 feature code |

**Schema status:** `base_scan_event` is live in dev-db with `validation_result text` and `validation_reason text?` as two distinct confirmed columns. `device_id text` is also a live NULLABLE column — BA14 populates it from the queue entry's `device_id` field at flush time. `scan_card_id` and `member_id` are NOT NULL on `base_scan_event`; BA14's flush path resolves these values — BA13 does not INSERT to `base_scan_event` directly and is not responsible for providing them at scan time.

**RLS forward spec for live eligibility reads:** RLS policies for `base_activity_booking` and `trac_itinerary_assignment` are forward-spec (not yet in dev-db). `core_member_card` is live in dev-db. RLS for these tables must follow the canonical `check_rbac_permission_with_context('read:page.scanning-runtime', ...)` pattern. Until `base_activity_booking` and `trac_itinerary_assignment` RLS policies are deployed, activity and transport eligibility reads are build prerequisites captured in §15.

**`base_scan_event` INSERT RLS prerequisite:** authenticated INSERT must be denied; service_role INSERT must be allowed. The full RLS migration spec is in BA12 §7.1 and §8. BA13 build depends on this RLS being deployed before the BA14 queue-flush path is tested end-to-end.

---

## 9. pace-core2 imports

### §9.1 Imports table

| Symbol | Import path | One-line why |
|--------|-------------|--------------|
| `Input` | `@solvera/pace-core/components` | Primary scan capture field; receives HID scanner keystrokes |
| `Button` | `@solvera/pace-core/components` | Override trigger, Dismiss, Manual scan, Back to scanning setup, Confirm override, Record manual scan, Cancel |
| `Badge` | `@solvera/pace-core/components` | Outcome result badges and direction badge in top bar |
| `Alert`, `AlertTitle`, `AlertDescription` | `@solvera/pace-core/components` | Scan-point not found and inactive scan-point exception states |
| `Card`, `CardContent` | `@solvera/pace-core/components` | Scan input block and result panel containers |
| `Dialog`, `DialogPortal`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogBody`, `DialogFooter` | `@solvera/pace-core/components` | Override confirmation dialog and manual scan dialog |
| `LoadingSpinner` | `@solvera/pace-core/components` | Auth-init and scan-point fetch loading states; validation-in-progress indicator |
| `toast` | `@solvera/pace-core/components` | Override recorded and manual scan recorded mutation feedback |
| `PagePermissionGuard`, `AccessDenied` | `@solvera/pace-core/rbac` | Route gating for `read:page.scanning-runtime` |
| `useSecureSupabase` | `@solvera/pace-core/rbac` | RLS-aware Supabase client for scan-point read and live eligibility queries |
| `useCan` | `@solvera/pace-core/rbac` | Permission-conditional rendering of Override and Manual scan actions |
| `useEvents` | `@solvera/pace-core/hooks` | `selectedEvent.id` and `selectedEvent.name` for scan-point identity display and eligibility scoping |
| `useUnifiedAuth` | `@solvera/pace-core/hooks` | `auth.uid()` for `override_by` field on override and manual scan queue entries |
| `NormalizeSupabaseError` | `@solvera/pace-core/utils` | Error normalisation for failed eligibility reads and scan-point fetch failures |
| `formatInTimeZone` | `@solvera/pace-core/utils` | `scanned_at` timestamp in event (or user) timezone within result panel |
| `EventId`, `OrganisationId`, `UserId` | `@solvera/pace-core/types` | Branded ID types at feature boundary |
| `collectSourceErrors`, `composeResilientState`, `resolveWithFallback` | `@solvera/pace-core/resilience` | Composing loading state from multiple eligibility data sources (scan-point, manifest, validation lookups) with partial-data fallback |
| `ChevronLeft` | `@solvera/pace-core/icons` | Icon for "Back to scanning setup" in top bar (BASE barrel; `ArrowLeft` not exported) |

### §9.2 Slice-specific caveats

**`useSecureSupabase()` returning null**

If `useSecureSupabase()` returns null (transient auth client initialisation), render a centred `LoadingSpinner` instead of issuing queries. Do not show an error state; the client resolves once auth state settles.

**`selectedEvent.id` — canonical field name**

`selectedEvent.id` is the canonical event identifier from `useEvents()`. Do not use `selectedEvent.event_id` — that field does not exist on `EventStub`.

**`Input` and HID scanner carriage-return handling**

HID keyboard-wedge scanners emit a carriage-return character (ASCII 13) at the end of each scan. Wire the `Input` field's `onKeyDown` or `onKeyUp` handler to detect Enter key (`key === 'Enter'`) and trigger the scan submission. Do not rely solely on a `<form>` submit event — some HID devices emit LF rather than CR+LF. The `Input` value at submission time is the full card identifier string.

**`DialogPortal` required for all dialogs**

Both the override and manual scan dialogs must be mounted via `DialogPortal` outside the component tree. Failing to use `DialogPortal` causes stacking context issues on mobile viewports where the runtime surface is full-screen.

**`toast` — module-level import**

`toast` is imported at module level per the BA00 app shell convention (cross-app decision 2026-05-04). No per-component or per-slice provider mounting is required or permitted.

**`useCan` — scope object for override / manual scan actions**

The `useCan` scope object for `update:page.scanning` must include `organisationId` and `eventId` resolved from the loaded `base_scan_point` row. These are resolved from the row itself after the initial fetch and passed into `useCan` for permission evaluation.

During scan point load (`scanPoint` is null), `useCan` for `update:page.scanning` must receive `organisationId: undefined, eventId: undefined`. The Override button is hidden (treated as permission denied) until the scan point row is loaded.

---

## 10. Permission and access rules

| Surface | Permission string | Enforcement mechanism |
|---------|------------------|-----------------------|
| Read `/scanning/:scanPointId` page | `read:page.scanning-runtime` | `PagePermissionGuard pageName="scanning-runtime" operation="read"` + `base_scan_point` RLS SELECT |
| Override button rendering and dialog confirmation | `update:page.scanning` | `useCan` conditional render; no RLS write from BA13 to `base_scan_event` |
| Manual scan button rendering and dialog confirmation | `update:page.scanning` | `useCan` conditional render |
| Live eligibility reads (`base_application`, `base_activity_booking`, `trac_itinerary_assignment`) | `read:page.scanning-runtime` | Inherited from page guard; RLS on each table |

No `create:page.scanning` permission check is needed in BA13. BA13 does not INSERT to `base_scan_event`. BA14 holds that write path via service_role.

RLS enforces scope at the database layer. Client-side `useCan` checks are defensive UI gating, not the security boundary.

RLS policies for `base_activity_booking` and `trac_itinerary_assignment` are forward-spec (not yet in dev-db). `core_member_card` is live in dev-db. These tables' RLS must follow the canonical `check_rbac_permission_with_context('read:page.scanning-runtime', ...)` pattern. Until `base_activity_booking` and `trac_itinerary_assignment` RLS policies are deployed, activity and transport live eligibility reads are build prerequisites captured in §15.

---

## 11. Acceptance criteria

- Given a user with `read:page.scanning-runtime` navigates to `/scanning/:scanPointId` where the scan point exists and `is_active = true`, then the runtime surface renders with `scan_point.name` in the top bar, the event name, the direction badge, and a focused scan `Input`.
- Given a user without `read:page.scanning-runtime` navigates to `/scanning/:scanPointId`, then `AccessDenied` is rendered and no scanning content is shown.
- Given a valid `scanPointId` that resolves to a row with `is_active = false`, when the page loads, then the `Alert variant="destructive"` "Scan point inactive" is rendered with `AlertDescription` "Scan point inactive — this scan point has been deactivated and cannot accept scans." and a "Back to scanning setup" button. No scan `Input` is rendered.
- Given a `scanPointId` that resolves to no accessible row, when the page loads, then the `Alert variant="destructive"` "Scan point not found" is rendered with the correct description and a "Back to scanning setup" button. No scan `Input` is rendered.
- Given the runtime surface is loaded and the Supabase client is null, then a centred `LoadingSpinner` is shown; no scan `Input` is rendered until the client resolves.
- Given a card scan with a `card_identifier` that matches an active `core_member_card` row and the participant has an approved `base_application` for the event (site context), when the HID scanner emits the keystrokes, then the result panel shows `Badge variant="solid-main-normal"` "Accepted" and the participant name; the result auto-clears after 3 seconds; the `Input` refocuses.
- Given a card scan with a `card_identifier` that matches no `core_member_card` row, when the scan is processed, then the result panel shows `Badge variant="solid-sec-muted"` "Card not recognised" (`card_not_recognised`); no Override button is shown; a Dismiss button is shown; the `Input` is disabled until Dismiss is pressed.
- Given a card scan with a `card_identifier` that matches a `core_member_card` row with `is_active = false`, when the scan is processed, then the result panel shows `Badge variant="solid-sec-muted"` "Card inactive" (`card_not_valid`); an Override button is shown (when user has `update:page.scanning`); a Dismiss button is shown; the `Input` is disabled until Dismiss is pressed.
- Given a card scan for a known participant with no confirmed booking (activity context), when the scan is processed, then the result panel shows `Badge variant="solid-sec-muted"` "Booking not valid" with an Override button (when user has `update:page.scanning`) and a Dismiss button.
- Given a card scan that produces `rejected` / `duplicate_scan`, when the result panel renders, then no Override button is shown (only Dismiss).
- Given an overridable rejection result and the operator has `update:page.scanning`, when "Override" is pressed, then the override Dialog opens with `DialogTitle` "Override scan result", a read-only rejection reason, and a "Notes (optional)" `Textarea`.
- Given the override Dialog is open, when "Confirm override" is pressed, then a new queue entry with `validation_result = 'accepted_override'` and `override_by = auth.uid()` is written to IndexedDB; the dialog closes; the result panel shows `Badge variant="solid-acc-normal"` "Accepted (override)"; the prior rejected entry is not mutated.
- Given the override Dialog is open, when "Cancel" is pressed, then the dialog closes and the rejected result panel remains visible with the Dismiss and Override buttons intact.
- Given the authenticated user lacks `update:page.scanning` and a rejection with an overridable class is displayed, then the Override button is absent; only the Dismiss button is shown.
- Given the authenticated user has `update:page.scanning`, when "Manual scan" is pressed, then the manual scan Dialog opens with a name-search `Input` and a disabled "Record manual scan" button.
- Given the manual scan Dialog is open and the operator types a name that matches at least one approved `base_application` row, then a dropdown list of up to **20** matching participants appears below the search `Input` (matches MS-PA-03 / §7.2).
- Given a participant is selected in the manual scan Dialog and "Record manual scan" is pressed, then a queue entry with `card_identifier = null`, `validation_result = 'accepted_override'`, `override_by = auth.uid()` is written to IndexedDB; the dialog closes; the result panel shows the override-accepted state.
- Given a scan is processed (any outcome), when the queue entry is written to IndexedDB, then `sync_status = 'pending'` and the entry is visible in the `ba13_scan_queue` object store.
- Given the device is offline when a card scan occurs, when the scan is processed and validated against the offline manifest, then the queue entry is written to IndexedDB with `sync_status = 'pending'` and the result panel shows the appropriate outcome — identical to the online path.
- Given a duplicate scan (same `card_identifier` at the same scan point within the dedup window), when the second scan is processed, then `rejected` / `duplicate_scan` is recorded and displayed; no Override button is shown.
- Given the user presses "Back to scanning setup" in the top bar, then navigation proceeds to `/scanning`.
- **Activity context, offline (MVP manifest contract):** BA12 activity/transport manifests use the shared `ManifestRow` shape in `src/features/scanningSetup/types.ts` (`card_identifier`, `person_id`, `name` only)—there is **no** per-session or per-booking row in the downloaded JSON. Therefore offline activity eligibility **cannot** distinguish “confirmed booking for this session” from manifest data alone. **MVP behaviour:** while offline, activity (and transport) scans are rejected with `booking_not_valid` (or an eligibility read error when a live read was required but unavailable), unless product later extends BA12 manifest payload and BA13 validation to carry session/leg scope. This supersedes any earlier wording that assumed booking-level rows inside the offline manifest file.

---

## 12. Verification

1. **Scan-point identity display:** Load `/scanning/:scanPointId` with a BA18 seed scan point. Verify `scan_point.name` is displayed in the top bar header (as stored in the database), the event name matches `selectedEvent.name`, and the direction badge displays the correct variant and text.
2. **Accepted scan flow:** Scan a card with a valid identifier against a seed participant with approved status (site context). Verify the result panel shows "Accepted" with the correct badge variant and participant name, then auto-clears after 3 seconds and refocuses the `Input`.
3. **Rejected — card not recognised:** Scan an identifier that matches no `core_member_card` row. Verify `Badge variant="solid-sec-muted"` "Card not recognised" (`card_not_recognised`) is shown, no Override button is present, the Dismiss button is shown, and the `Input` is disabled until Dismiss is pressed. Also verify: scan an identifier that matches a row with `is_active = false`; confirm `Badge` "Card inactive" (`card_not_valid`) is shown with an Override button present.
4. **Override flow:** Produce a `rejected` / `booking_not_valid` result. Verify the Override button is shown (when user has `update:page.scanning`). Press Override, enter notes, confirm. Verify the IndexedDB queue contains a new entry with `validation_result = 'accepted_override'`, the prior rejected entry is unmodified, and the result panel shows the override-accepted state.
5. **Non-overridable rejection:** Produce a `rejected` / `duplicate_scan` result. Verify no Override button is shown.
6. **Manual scan:** Press "Manual scan". Search for a participant name. Select a result. Press "Record manual scan". Verify the IndexedDB queue entry has `card_identifier = null`, `validation_result = 'accepted_override'`, `override_by` matches `auth.uid()`.
7. **Offline behaviour:** Disable network. Scan a card present in the offline manifest. Verify the result panel shows the correct outcome and the queue entry is written to IndexedDB without any network request for the validation step.
8. **Duplicate scan dedup:** Scan the same valid card twice within 60 minutes at the same scan point. Verify the second scan produces `rejected` / `duplicate_scan`.
9. **Inactive scan-point guard:** Navigate to `/scanning/:scanPointId` for a scan point with `is_active = false`. Verify the inactive warning `Alert` is shown, no `Input` is rendered, and "Back to scanning setup" navigates to `/scanning`.
10. **Scan-point not found guard:** Navigate to `/scanning/00000000-0000-0000-0000-000000000000` (non-existent ID). Verify the not-found `Alert` is shown.
11. **Access denied:** Log in as a user without `read:page.scanning-runtime`. Navigate to the route. Verify `AccessDenied` renders.
12. **Permission-conditional: override absent without `update:page.scanning`:** Log in as a user with `read:page.scanning-runtime` only. Produce an overridable rejection. Verify Override button is absent; Dismiss is present.
13. **Permission-conditional: manual scan absent without `update:page.scanning`:** Verify "Manual scan" button does not render.
14. **IndexedDB queue inspection:** After multiple scans, query `indexedDB.open('ba13_scan_queue')` in the browser console. Verify entries exist with the correct `local_id`, `scan_point_id`, `validation_result`, `validation_reason`, `sync_status = 'pending'`, `scanned_at` as number.

---

## 13. Testing requirements

**Duplicate-scan timing test:** verify that the dedup window boundary is correct — a scan at exactly `dedup_window_ms` elapsed returns accepted, a scan at `dedup_window_ms - 1ms` elapsed returns `duplicate_scan`. Mock `Date.now()` to control timing.

**Offline eligibility fallback test:** mock the device as offline (block all Supabase network calls). Provide a pre-seeded offline manifest. Verify eligibility resolution uses the manifest exclusively and produces the correct acceptance or rejection outcome without network.

**Override immutability test:** after confirming an override, query the IndexedDB queue and verify the prior rejected entry is present and unmodified; a separate second entry with `validation_result = 'accepted_override'` exists with its own `local_id`.

**Manual scan — no card identifier:** after a manual scan is recorded, verify `card_identifier = null` in the queue entry. Verify `override_by` is non-null and matches the test user's UID.

**`sync_status` invariant test:** verify no BA13 code path writes `sync_status` values other than `pending`. All other `sync_status` transitions belong to BA14.

---

## 14. Build execution rules

- **Stop** on any `base_scan_point` read if the RLS policy using `check_rbac_permission_with_context('read:page.scanning-runtime', ...)` is not deployed and confirmed on dev-db.
- **Stop** on any queue-to-Supabase path until `base_scan_event` RLS is deployed with authenticated INSERT denied and service_role INSERT allowed.
- **Stop** on activity context eligibility validation until `base_activity_booking` and `base_activity_session` land in dev-db.
- **Stop** on transport context eligibility validation until `trac_itinerary_assignment` lands in dev-db.
- Site and meal context scanning may be built and tested independently of activity and transport context once `base_scan_point` RLS is deployed (`core_member_card` is already live in dev-db).
- Do not issue any authenticated INSERT, UPDATE, or DELETE against `base_scan_event` from BA13 code.
- Do not attempt to implement sync, upload retry, conflict resolution, or queue-to-Supabase flush in this slice — those belong to BA14.
- Do not use `window.confirm()` for any confirmation flow.
- Do not ship hardcoded fixture scan results in route code. Loading, exception, and result states are driven by real data or BA18 seed.

---

## 15. Done criteria

- All §11 acceptance criteria verified with evidence (not pre-ticked).
- §12 verification flows completed for all context types that are unblocked; activity and transport context verification completed once forward-spec tables land.
- BA18 seed data confirmed available for non-empty scan scenarios.
- QA pack at [`docs/test-packs/BA13-qa-pack.md`](../test-packs/BA13-qa-pack.md) executed; quality gates green.
- `base_scan_event` two-column schema split (`validation_result` + `validation_reason`) confirmed deployed to dev-db. `device_id text NULLABLE` confirmed as a live column. `scan_card_id` and `member_id` NOT NULL constraints noted — BA14 flush path is responsible for resolving these values.
- IndexedDB queue structure confirmed matching BR-IQ-01 field shape.
- BA14 sync worker confirmed able to read entries from `ba13_scan_queue` and flush to `base_scan_event` (end-to-end sync verified in integration).
- BA12's manifest download buttons must write to the `ba12_manifests` IndexedDB store before BA13's offline path can be verified. This requires a BA12 patch — see BA12 patch note.
- RLS policies for `base_activity_booking` and `trac_itinerary_assignment` must be deployed before activity and transport live eligibility reads can be tested end-to-end (`core_member_card` is already live in dev-db).

---

## 16. Do not

- Do not render or embed any content from `/scanning` (BA12 admin hub). BA13 owns `/scanning/:scanPointId` only.
- Do not implement sync, upload retry, idempotency, or conflict resolution — those belong to BA14.
- Do not implement device registry, tracking dashboard, or card lifecycle management — those belong to BA14, BA16, and TEAM respectively.
- Do not issue any write to `base_scan_event` from authenticated client code. BA13 writes to the local IndexedDB queue only.
- Do not use a camera or software QR scanning library — card input is HID keyboard-wedge only in MVP. No third-party scanning library is permitted.
- Do not collapse distinct rejection classes into a single generic error — each class must render its own label, description, and override permission state.
- Do not make scan events editable — no edit, mutation, or delete affordance on any recorded scan event or queue entry (except BA14 updating `sync_status`).
- Do not allow override for `card_not_recognised` or `duplicate_scan` rejection classes.
- Do not treat manual scan as silent record injection — it requires an explicit operator participant selection via the manual scan dialog.
- Do not use `PaceAppLayout` or the standard app sidebar on this route. The runtime uses a custom minimal shell.
- Do not render `accepted_override` without `override_by = auth.uid()` — operator attribution is mandatory for all override and manual scan entries.
- Do not write `upload_conflict` or any `sync_status` value other than `pending` from BA13 code.
- Do not introduce a `not_checked_in` rejection class — no validation step in this slice produces it. If a check-in concept is added to the data model in a future slice, this class may be reintroduced at that time.
- Failed-sync UI feedback (e.g. a persistent indicator when `sync_status = 'failed'` entries exist) is out of scope for BA13. BA14 owns the sync health feedback surface.

---

## 17. References

- `docs/requirements/BASE-architecture.md` — §7 Scanning domain; route ownership map; BA12→BA13→BA14→BA16 chain; AD-002 scanner runtime shell boundary exception.
- `docs/requirements/BASE-project-brief.md` — scanning operational context.
- `docs/requirements/BA12-scanning-setup-requirements.md` — `BA12.scan_point.list` and `BA12.manifest.*` contracts; BR-SP-Label derived label format; `base_scan_point` and `base_scan_event` column shapes.
- `docs/requirements/BA14-scanning-sync-reconciliation-requirements.md` — queue flush, sync idempotency, conflict persistence, and `sync_status` transitions.
- `docs/requirements/BA16-scanning-tracking-dashboard-requirements.md` — dashboard consumes BA13.contract rows after BA14 flush.
- `docs/requirements/BA06-applications-admin-and-review-requirements.md` — approved application state contract consumed by site and meal eligibility validation.
- `docs/requirements/BA11-booking-operations-oversight-requirements.md` — `base_activity_booking` confirmed-booking contract consumed by activity eligibility validation.
- `docs/requirements/BA18-base-dev-seed-data-requirements.md` — seed data required for non-empty scan verification scenarios.
