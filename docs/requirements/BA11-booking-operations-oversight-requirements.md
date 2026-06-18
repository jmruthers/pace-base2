# BA11 — Activity Booking Operations and Oversight

## Slice metadata

- Status: Draft
- Depends on: BA09 (activity offering and session setup), BA10.contract (booking projection and validation contracts)
- Backend impact: Write contracts required (RPCs) — `app_base_activity_booking_create` and `app_base_activity_booking_cancel` are the normative write contracts; neither is deployed to dev-db yet. Read/oversight surface uses RBAC-checked RLS and builds independently.
- Frontend impact: UI — `/activities/bookings` organiser-facing oversight surface

---

## 2. Overview

BA11 delivers the organiser-facing surface at `/activities/bookings` for booking oversight, individual participant booking management, and operational mutations. Organisers can view all bookings for the selected event, filter by status and session, create bookings on behalf of approved participants, cancel bookings, and manually promote waitlisted participants to confirmed.

The read and oversight surface (list, filter, detail columns) builds independently. The three mutation surfaces (create-on-behalf, cancel, manual waitlist promotion) are fully specified in this slice but are blocked from build execution until `app_base_activity_booking_create` and `app_base_activity_booking_cancel` are deployed to dev-db. This is a build-queue state, not a scope cut — the full §4, §5, §6, §7 specification is included for all mutation surfaces.

This slice does not own participant-facing booking UI. Participant booking journeys are implemented in pace-portal (`/:eventSlug/activities`). BASE owns booking oversight, organiser operations, and the backend contracts consumed by both.

---

## 3. What this slice delivers

### Purpose

Event organisers need a dedicated surface to oversee all activity bookings for their event — who is confirmed, who is waitlisted, and who has been cancelled — and to take action where needed: creating bookings for participants who cannot self-serve, cancelling inappropriate bookings, and promoting deserving waitlisted participants when capacity allows.

### Surfaces

- **`/activities/bookings`** — gated page listing all `base_activity_booking` rows for the currently selected event, with filter controls (status, session, offering) and row-level actions for mutation operations.

### Boundaries

- This slice does not own participant-facing booking UI. Participant booking journeys are pace-portal routes (AD-001).
- Booking write operations call the named RPCs (`app_base_activity_booking_create`, `app_base_activity_booking_cancel`). No direct client-side `base_activity_booking` inserts or updates (AD-003).
- Direct reassignment (moving a participant between sessions in a single operation) is out of scope. The approved path is an explicit cancel + create sequence.
- Booking rules (capacity enforcement, duplicate prevention, eligibility, source tracking) are server-side concerns owned by the RPCs — not re-implemented in client code.
- Consent capture is not an organiser obligation in this slice. Organiser create-on-behalf does not trigger consent gates (that is a participant self-service concern in BA10/pace-portal).
- Waitlist auto-promotion is not part of this slice. Manual promotion via the "Promote" row action is in scope once the RPC is deployed.
- Activity offering and session setup belong to BA09, not BA11.

### Architectural posture

- All reads use **`useSecureSupabase()`** from `@solvera/pace-core/rbac`. No service-role client in route code.
- The read surface queries `base_activity_booking` through RBAC-checked RLS — the same `check_rbac_permission_with_context` pattern used in `base_application`.
- Mutation surfaces call `app_base_activity_booking_create` and `app_base_activity_booking_cancel` as Supabase RPC calls.
- **`PagePermissionGuard`** gates the route using `pageName="bookings"` and `operation="read"`.
- Event context is resolved via **`useEvents()`** — use `selectedEvent.id` as the `event_id` at all data boundaries.

### Page-level guards and evaluation ordering for `/activities/bookings`

1. Outer **`PagePermissionGuard`** with `pageName="bookings"` and `operation="read"` wraps the main content.
2. If the guard denies access, **`AccessDenied`** is shown immediately. No-event messaging does not replace or precede denial.
3. If the guard is loading and no custom `loadingFallback` prop is supplied, **`PagePermissionGuard`** renders `null` — neither children nor the denial state is shown. A null Supabase client (transient auth initialisation) renders a centred **`LoadingSpinner`** in the main content region.
4. If the guard permits and **no event is selected** (`selectedEvent` is null or `selectedEvent.id` is falsy), the page shows a blocking **`Card`** instructing the user to select an event in the shell header. Data fetches do not run.
5. If the guard permits and **an event is selected**, data loads for that `event_id`.

---

## 4. Functional specification

Prefix legend: **`BK`** /activities/bookings page-level, **`BL`** booking list, **`BC`** create-on-behalf, **`BX`** cancel, **`BP`** promote (waitlist promotion).

### `/activities/bookings` — page entry

1. **BK-PE-01 —** Navigating to `/activities/bookings` renders inside the BA00 authenticated shell; no mandatory query parameters.
2. **BK-PE-02 —** With an event selected, the page loads all `base_activity_booking` rows for `selectedEvent.id`, joined to session and offering display fields.
3. **BK-PE-03 —** Page chrome: `h1` "Bookings" and a subtitle naming the selected event and describing the surface ("Manage activity bookings for this event.").

### `/activities/bookings` — loading states

4. **BK-LS-01 —** While the booking query is unresolved and the guard permits with an event selected, the bookings `DataTable` receives `isLoading` true (table shows built-in loading row with `LoadingSpinner` per pace-core `DataTable` behaviour).
5. **BK-LS-02 —** A null Supabase client (transient auth initialisation) renders a centred `LoadingSpinner` in the main content region. No error is shown; the client resolves automatically once auth state settles.

### `/activities/bookings` — empty states

6. **BK-ES-01 —** Event selected, zero bookings: the `DataTable` shows its empty state with copy "No bookings have been created for this event."
7. **BK-ES-02 —** No event selected: the page shows a blocking `Card` with `CardTitle` "No event selected" and `CardDescription` "Select an event from the header to manage its bookings." The `DataTable` and action buttons do not render; data fetches do not run.

### `/activities/bookings` — error states

8. **BK-ER-01 —** Booking list fetch failure: `Alert` `variant="destructive"` with the normalised error message from `normalizeSupabaseError` and a **Retry** control that refetches the bookings query.

### `/activities/bookings` — bookings list content

9. **BL-PC-01 —** The bookings list is a **`DataTable`** with title "Activity Bookings" and a description showing the booking count and selected event name.
10. **BL-PC-02 —** Columns (in order): **Participant** (preferred name or first/last, sortable), **Offering** (offering name, sortable), **Session** (session name or start time formatted, sortable), **Status** (`Badge`, sortable), **Source** (human-readable source label, sortable), **Booked** (formatted `booked_at` timestamptz, sortable).
11. **BL-PC-03 —** Status badge mapping:
    - `confirmed` → `Badge variant='solid-main-normal'` "Confirmed"
    - `waitlisted` → `Badge variant='outline-acc-muted'` "Waitlisted"
    - `cancelled` → `Badge variant='outline-sec-muted'` "Cancelled"
12. **BL-PC-04 —** Source label mapping:
    - `self` → "Self"
    - `admin_assigned` → "Admin assigned"
    - Any other value → the raw value
13. **BL-PC-05 —** Rows are ordered by `booked_at` descending on initial load.
14. **BL-PC-06 —** The `DataTable` enables search (across participant name, offering name, session name) and filtering (by `status` Select, by session `Select`, by offering `Select`). Pagination is enabled. Sorting, export, import, editing, creation, and deletion through the DataTable toolbar are disabled — mutations use custom row actions and dedicated buttons.

### `/activities/bookings` — create-on-behalf action

15. **BC-PA-01 —** A **"Book on behalf"** button above the `DataTable` (outside the DataTable toolbar) opens a controlled `Dialog` with the create-on-behalf form. The button is only rendered when the authenticated user has `create:page.bookings` permission. _Build blocked — see §14._
16. **BC-PA-02 —** Create-on-behalf form fields (within `DialogBody`):
    - **Participant** — required `Select`; options are `base_application` rows where `event_id = selectedEvent.id AND status = 'approved'`, sorted by participant last name; label shows preferred name (or first/last name) and application ID for disambiguation.
    - **Session** — required `Select`; options are all `base_activity_session` rows for `selectedEvent.id`, grouped by offering name, sorted by `start_time`; label shows offering name + session name or formatted `start_time`.
    - **Override capacity** — optional `Checkbox` labelled "Override capacity limit". Appears for all create-on-behalf actions (organiser always has this option available). When checked, the Override Dialog fires on submit.
    - **Override booking window** — optional `Checkbox` labelled "Override booking window". When checked, the Override Dialog fires on submit.
    - **Override session conflict** — optional `Checkbox` labelled "Override session conflict". When checked, the Override Dialog fires on submit.
17. **BC-PA-03 —** `DialogFooter` contains `Button variant="outline"` labelled "Cancel" (closes Dialog, no data submitted) and `Button variant="default"` `type="submit"` labelled "Book" (triggers form submission). `SaveActions` is not used here — its save label cannot be overridden from "Save" (see §9.2 caveat).
18. **BC-PA-04 —** On submit: if any override checkbox is checked, close the create form Dialog and open the Override Dialog (see BC-PA-05). If no override is checked, call `app_base_activity_booking_create` directly with the form values plus `source = 'admin_assigned'`. Success: Dialog closes, toast "Booking created", list refreshes. Failure: toast with normalised error; Dialog stays open.
19. **BC-PA-05 —** The Override Dialog (appears after create form when an override is selected) contains:
    - `DialogHeader` with `DialogTitle` matching the override type (e.g. "Override capacity and book").
    - `DialogBody` with a `Textarea` `name="override_reason"` `label="Override reason"` required, `maxLength={500}`, `placeholder="Reason for override (required)"`.
    - `DialogFooter` with `Button variant="destructive"` labelled "Book with override" and `Button variant="outline"` labelled "Cancel".
    - On confirm: call `app_base_activity_booking_create` with override flags set, `p_override_reason` (Textarea value, trimmed), `p_override_by` (`auth.uid()`). Do not supply `p_override_at` from the client — the RPC sets this server-side as a server timestamp. Success: Dialog closes, toast "Booking created with override", list refreshes. Failure: toast with normalised error; Override Dialog stays open.

### `/activities/bookings` — cancel action

20. **BX-PA-01 —** A **Cancel** row action appears on rows where `status IN ('confirmed', 'waitlisted')`. The action is only rendered when the authenticated user has `delete:page.bookings` permission. _Build blocked — see §14._
21. **BX-PA-02 —** Pressing Cancel opens a confirmation `Dialog` with:
    - `DialogTitle` "Cancel booking".
    - `DialogBody`: participant name, session name, and formatted `start_time`. Copy: "Cancel this booking? The participant will lose their place and the capacity slot will be released (if confirmed)."
    - `DialogFooter`: `Button variant="destructive"` "Cancel booking" and `Button variant="outline"` "Go back".
22. **BX-PA-03 —** On confirm, call `app_base_activity_booking_cancel` with `p_booking_id`, `p_cancelled_by = auth.uid()`, `p_source = 'admin'`, `p_reason = null` (no reason required from organiser in v1). Success: Dialog closes, toast "Booking cancelled", list refreshes. Failure: toast with normalised error; Dialog stays open.

### `/activities/bookings` — waitlist promotion action

23. **BP-PA-01 —** A **Promote** row action appears on rows where `status = 'waitlisted'`. The action is only rendered when the authenticated user has `update:page.bookings` permission. _Build blocked — see §14._
24. **BP-PA-02 —** Pressing Promote opens a confirmation `Dialog` with:
    - `DialogTitle` "Promote to confirmed".
    - `DialogBody`: participant name, session name, and capacity impact note — "Confirm promotion for {preferred name} to {session name}? This will confirm the booking and consume one capacity slot." (where `{preferred name}` is the participant's preferred name or first/last name, and `{session name}` is the session's `session_name` or formatted `start_time`).
    - `DialogFooter`: `Button variant="default"` "Promote" and `Button variant="outline"` "Cancel".
25. **BP-PA-03 —** On confirm, call `app_base_activity_booking_create` with `p_application_id` (from the waitlisted booking row), `p_session_id`, `p_event_id`, `p_organisation_id`, `p_source = 'admin_assigned'`, `p_promote_from_waitlist = true` (signals the RPC to promote the active waitlisted row to `confirmed` rather than creating a new booking — this flag suppresses the duplicate-active-booking rejection and instead transitions the row). Override fields are null (promotion is not an override-eligible action unless capacity is full — in that case the Override Dialog fires instead). Success: Dialog closes, toast "Participant promoted to confirmed", list refreshes. Failure: toast with normalised error; Dialog stays open.

    **Build note:** The `p_promote_from_waitlist` parameter must be confirmed in the RPC migration before this surface is built. If the RPC instead resolves promotion by accepting `p_booking_id` (the waitlisted booking's UUID), update this call to supply `p_booking_id` instead. The mechanism must be explicit in the migration — the client must not rely on duplicate-booking detection semantics to implicitly trigger promotion.

26. **BP-PA-04 —** If the session is at capacity when the organiser triggers Promote, the Override Dialog fires with the override type "Override capacity and promote". Override reason is required. On confirm, call `app_base_activity_booking_create` with `p_promote_from_waitlist = true`, `p_override_capacity = true`, `p_override_reason` (Textarea value, trimmed), `p_override_by` (`auth.uid()`). Do not supply `p_override_at` from the client — set server-side by the RPC.

### Both routes — permission-conditional rendering

27. **PA-PERM-01 —** When the authenticated user has `read:page.bookings` but lacks `create:page.bookings`, the "Book on behalf" button is not rendered.
28. **PA-PERM-02 —** When the user lacks `update:page.bookings`, the Promote row action is not rendered.
29. **PA-PERM-03 —** When the user lacks `delete:page.bookings`, the Cancel row action is not rendered.
30. **PA-PERM-04 —** When the user lacks `read:page.bookings` entirely, the route renders `AccessDenied`.

### Non-empty verification

31. **BK-VER-01 —** Non-empty state verification uses BA18 seed data, not route-local fixtures.

---

## 5. Visual specification

- Prototype reference: `pace-prototype/apps/pace-base/pages/UnitsActivitiesScanPage.jsx` (`BookingsPage`).

### Prototype layout summary

1. **PageHeader** — breadcrumb through Activities; title "All bookings".
2. **DataTable** — Activity, Session, Participant, Status badge, Reassign/Cancel row actions.

### Route map

| Prototype | BASE |
|---|---|
| `#/events/:code/activities/bookings` | `/activities/bookings` |

### Implementation delta (pass 2)

- Linked from Activities header "All bookings" button in prototype.

### Layout — `/activities/bookings`

- **`main`** uses Standard 07 page padding (`px-6 py-8` on `sm` and above; `px-4 py-6` on `xs`/mobile — follow the BA00 shell standard if it defines a tighter mobile padding).
- **Heading block:** `h1` "Bookings", `p` subtitle with event name and surface description. Block is full-width at all breakpoints.
- **"Book on behalf" button:** `Button variant="default"` placed immediately below the heading block, left-aligned on all breakpoints. Label "Book on behalf". Only rendered when user has `create:page.bookings`. On mobile (`xs`), the button remains full-width only if the BA00 shell imposes full-width buttons; otherwise left-aligned inline.
- **`DataTable`:** full-width below the button at all breakpoints. `initialPageSize={50}`. On narrow viewports, the DataTable's built-in horizontal scroll handles column overflow — no column hiding rules are defined for this surface.
- **Dialogs:** rendered in a portal over full viewport at all breakpoints. `DialogContent` max-width `sm` (≈480 px) on desktop; on mobile viewports narrower than `sm`, `DialogContent` spans full viewport width with standard side padding.

### Components — bookings DataTable

- **`DataTable` features config:**

```ts
features: {
  search:           true,
  pagination:       true,
  sorting:          true,
  filtering:        true,   // status, session, offering filter controls
  export:           false,
  import:           false,
  grouping:         false,
  columnVisibility: false,
  editing:          false,
  creation:         false,  // create via "Book on behalf" button above DataTable
  selection:        false,
  deletion:         false,  // cancel via custom row action
  deleteSelected:   false,
  columnReordering: false,
  hierarchical:     false,
}
```

- **Columns** (header copy → width hint): Participant → medium-wide, Offering → medium, Session → medium, Status → narrow, Source → narrow, Booked → medium.
- **Status cell:** `Badge` per BL-PC-03.
- **Row actions (rightmost column):**
  - **Promote** `Button variant="default"` `size="small"` — visible only on `status = 'waitlisted'` rows and only when user has `update:page.bookings`.
  - **Cancel** `Button variant="destructive"` `size="small"` — visible only on `status IN ('confirmed', 'waitlisted')` rows and only when user has `delete:page.bookings`.

### Components — create-on-behalf Dialog

**Single-step form (not two-step):** The create-on-behalf Dialog presents all fields in a single step — Participant, then Session (grouped by offering), then override checkboxes. A cascading two-step flow (select Offering first, then filter Session by that Offering) is not implemented in v1. The Session `Select` groups options by offering name using `SelectGroup`/`SelectLabel` to aid navigation without requiring a separate step.

- **`Dialog`** controlled by `open`/`onOpenChange`. `DialogTitle` "Book on behalf".
- **`DialogBody`** contains `Form` with `FormField` elements in order: Participant (`Select`, required), Session (`Select` with `SelectGroup` grouping by offering name, required), Override capacity (`Checkbox`, optional), Override booking window (`Checkbox`, optional), Override session conflict (`Checkbox`, optional).
- **`DialogFooter`** contains `Button variant="outline"` labelled "Cancel" (closes Dialog, no submission) and `Button variant="default"` `type="submit"` labelled "Book". `SaveActions` is not used — its save label is fixed as "Save" with no override prop (see §9.2 caveat).

### Components — Override Dialog

- **`Dialog`** controlled by `open`/`onOpenChange`. `DialogTitle` reflects the override type (e.g. "Override capacity and book").
- **`DialogBody`** contains a `Textarea` `name="override_reason"` labelled "Override reason", required, `maxLength={500}`, `rows={4}`, `placeholder="Reason for override (required)"`. Helper text: "Required. Explain why this override is necessary (max 500 characters)." Field-level error copy: "Override reason is required." (shown if the form is submitted while the field is empty — the confirm button disabled state should prevent this, but the error copy must be specified for completeness and keyboard/accessibility edge cases).
- **`DialogFooter`:** `Button variant="destructive"` labelled with the action name (e.g. "Book with override" or "Promote with override"), `disabled` while `override_reason` is empty or whitespace-only + `Button variant="outline"` "Cancel".

### Components — cancel confirmation Dialog

- **`Dialog`** controlled. `DialogTitle` "Cancel booking".
- **`DialogBody`:** participant name, session, formatted start time, and the copy from BX-PA-02.
- **`DialogFooter`:** `Button variant="destructive"` "Cancel booking" + `Button variant="outline"` "Go back".

### Components — promote confirmation Dialog

- **`Dialog`** controlled. `DialogTitle` "Promote to confirmed".
- **`DialogBody`:** participant name, session, and capacity impact note from BP-PA-02.
- **`DialogFooter`:** `Button variant="default"` "Promote" + `Button variant="outline"` "Cancel".

### States

- **Loading (guard loading):** `null` per `PagePermissionGuard` default.
- **Loading (Supabase client null):** centred `LoadingSpinner` in main content region.
- **Loading (data fetch):** `DataTable` `isLoading` rows (built-in loading spinner per pace-core `DataTable`).
- **No event selected:** full-width `Card` directly below the heading block. `CardTitle` "No event selected", `CardDescription` "Select an event from the header to manage its bookings." DataTable and action buttons do not render.
- **Empty:** `DataTable` empty state "No bookings have been created for this event."
- **Error:** `Alert variant="destructive"` with normalised error and Retry control.
- **Access denied:** `AccessDenied` component (from `@solvera/pace-core/components`).
- **Success mutations:** `toast()` with `variant='success'` for all create/cancel/promote successes.
- **Failure — already-cancelled race (cancel flow):** If `app_base_activity_booking_cancel` returns `base_booking_already_cancelled` (concurrent cancel by another organiser between row render and user confirmation), show a `toast()` with `variant='destructive'` and the message "This booking has already been cancelled." The Dialog closes. The list refreshes to show the current state.
- **Failure — distinct RPC error codes:** Each failure class from §7.2 maps to a `toast()` with `variant='destructive'` and the normalised error message from `normalizeSupabaseError`. No failure class silently swallows the error.

### Interactions

- **`window.confirm` is not used anywhere in this slice.** All confirmations use pace-core `Dialog`.
- **Dialog focus:** `DialogContent` calls `focusFirstFocusableIn` on open; Escape and backdrop click close the dialog and return focus to the trigger.
- **Form validation:** Zod validation runs on submit (`mode='onSubmit'`). Field-level errors appear inline below each field.
- **Override Dialog sequencing:** The Override Dialog opens after the create form closes — the user does not see both dialogs simultaneously. If the user cancels from the Override Dialog, the operation is aborted; the create form does not re-open automatically (the user may press "Book on behalf" again to restart).
- **Override Dialog confirm button disabled state:** The destructive confirm button ("Book with override" / "Promote with override") is `disabled` until the `override_reason` `Textarea` contains at least one non-whitespace character. Once non-whitespace text is present, the button becomes enabled. If the field is cleared back to empty or whitespace-only, the button returns to `disabled`. No submit is possible while the button is disabled — this enforces the non-empty contract without relying on form validation error display.

### Confirmation dialog copy

| Flow | Title | Description | Confirm label | Variant |
|------|-------|-------------|---------------|---------|
| Cancel confirmed/waitlisted booking | Cancel booking | Cancel this booking? The participant will lose their place and the capacity slot will be released (if confirmed). | Cancel booking | destructive |
| Promote waitlisted booking (capacity available) | Promote to confirmed | Confirm promotion for {name} to {session}? This will confirm the booking and consume one capacity slot. | Promote | default |
| Promote waitlisted booking (capacity full — override) | Override capacity and promote | Override the capacity limit and promote {name}? (+ override reason Textarea) | Promote with override | destructive |
| Create on behalf with override | Override {type} and book | Override {type} for {participant} in {session}? (+ override reason Textarea) | Book with override | destructive |

---

## 6. Business rules

### BR-Create-OnBehalf — Organiser create-on-behalf

**Trigger:** Organiser submits the create-on-behalf form with a selected participant (approved application) and a selected session.  
**Pre-conditions:** `selectedEvent.id` is non-null; authenticated user has `create:page.bookings`; a `base_application` row with `status = 'approved'` for the selected event is the participant identifier.  
**Action:** Call `app_base_activity_booking_create` with `source = 'admin_assigned'`.  
**Server-side enforcement (within RPC):**
- Capacity: only `confirmed` bookings count toward `base_activity_session.capacity`. RPC rejects if capacity full and `p_override_capacity = false`.
- Duplicate prevention: RPC rejects if an active booking (`status IN ('confirmed', 'waitlisted')`) already exists for the same `(application_id, session_id)` pair.
- Booking window: RPC rejects if outside booking window and `p_override_window = false`.
- Session conflict: RPC rejects if the participant has an active booking for a time-overlapping session and `p_override_conflict = false`.
- Integrity checks not overridable: record existence, valid event scope, valid application scope — these always apply regardless of override flags.  
**Override path:** if any override flag is true, `override_reason` (non-empty, max 500 chars), `override_by` (`auth.uid()`), and `override_at` (server timestamp) must be supplied. RPC enforces the non-null contract on these fields when any override flag is true.  
**Success state:** `base_activity_booking` row created with `status = 'confirmed'` (if capacity available) or `status = 'waitlisted'` (if capacity full and `allow_waitlist = true` on the offering). Booking list refreshes.

### BR-Cancel — Organiser cancel booking

**Trigger:** Organiser confirms the cancel booking dialog for a `confirmed` or `waitlisted` booking.  
**Pre-conditions:** `base_activity_booking.status IN ('confirmed', 'waitlisted')`; authenticated user has `delete:page.bookings`.  
**Action:** Call `app_base_activity_booking_cancel` with `source = 'admin'`, `p_cancelled_by = auth.uid()`.  
**Server-side enforcement:** RPC sets `status = 'cancelled'`, `cancelled_at = now()`, releases the capacity slot if `confirmed`.  
**No override path for cancel in v1:** cancel is not an override-eligible action in this wave. `p_override_reason`, `p_override_by`, `p_override_at` are null on all organiser cancel calls in v1.  
**Success state:** booking row updated; list refreshes. Capacity slot released if booking was `confirmed`.

### BR-WaitlistPromotion — Manual waitlist promotion

**Trigger:** Organiser confirms the Promote dialog for a `waitlisted` booking row.  
**Pre-conditions:** `base_activity_booking.status = 'waitlisted'`; authenticated user has `update:page.bookings`.  
**Action (capacity available):** Call `app_base_activity_booking_create` with `p_application_id`, `p_session_id`, `p_source = 'admin_assigned'`, `p_promote_from_waitlist = true`, override flags all false. The `p_promote_from_waitlist` flag directs the RPC to transition the active waitlisted row to `confirmed` rather than creating a new booking record. `p_override_at` is not supplied by the client — set server-side by the RPC.  
**Action (capacity full):** Override Dialog fires. Organiser must supply `override_reason`. Call `app_base_activity_booking_create` with `p_promote_from_waitlist = true`, `p_override_capacity = true`, `p_override_reason` (trimmed, non-empty), `p_override_by` (`auth.uid()`). `p_override_at` is not supplied by the client — set server-side by the RPC.  
**Success state:** booking promoted from `waitlisted` to `confirmed`; list refreshes.

### BR-Override — Override-eligible action path

**Trigger:** Any create-on-behalf or waitlist promotion action where the organiser explicitly selects one or more override checkboxes, or where the server returns a failure class that requires override to proceed.  
**Override-eligible failure classes:**
- Capacity full (`p_override_capacity = true`)
- Booking window closed (`p_override_window = true`)
- Session time conflict (`p_override_conflict = true`)
- Waitlist ordering (implicit when promoting via capacity override)

**Non-overridable:** duplicate active booking, record non-existence, out-of-scope event or application — the RPC rejects these regardless of override flags.  
**UI enforcement:** Override Dialog must appear before the RPC is called. The Override Dialog's `Textarea` is required; the confirm button is disabled until the field contains non-whitespace text.

### BR-Override-Audit — Override field persistence

**Trigger:** Any RPC call where at least one override flag is true.  
**Fields submitted by client:** `p_override_reason` (Textarea value, trimmed, non-empty, max 500 chars) and `p_override_by` (from `auth.uid()`).  
**Field set server-side:** `override_at` — the RPC sets this as `now()` (server timestamp). The client does not supply `p_override_at`. Do not include `p_override_at` in any client RPC call.  
**Both `p_override_reason` and `p_override_by` must be non-null in every override-path RPC call.** Calls that set any override flag to true without supplying these two fields are rejected by the RPC with `base_booking_override_reason_required`.

### BR-Status-Enum — Booking status values

**Source:** BA10.contract (Q-8 resolution, Kusi 2026-05-11).  
**Enum:** `confirmed | waitlisted | cancelled`. No other values are valid. The status is set server-side by the RPC — never written from client code directly.

### BR-Capacity-Counting — Capacity counting rules

**Source:** BA10.contract BR-Outcome-2.  
**Rules (authoritative in BA10; referenced here for context of mutation outcomes):**
- Only `confirmed` bookings count toward `base_activity_session.capacity`.
- `cancelled` bookings release their capacity slot and do not count.
- `waitlisted` bookings do not consume a capacity slot.

These rules are enforced server-side by `app_base_activity_booking_create`. BA11's UI does not re-implement capacity counting logic.

### BR-ParticipantSelection — Approved applications only

**Trigger:** create-on-behalf Participant `Select` options query.  
**Query:** `base_application WHERE event_id = selectedEvent.id AND status = 'approved'`.  
**Rationale:** Only approved participants may receive organiser-assigned bookings. Draft, submitted, under-review, rejected, or withdrawn applications are excluded from the selector.

### BR-Scope — Event-scoped queries

All booking queries filter by `event_id = selectedEvent.id`. RLS on `base_activity_booking` (once migrated) enforces scope at the database layer.

### BR-No-DirectReassign — No direct session reassignment

Direct reassignment (moving a participant between sessions in a single operation) is out of scope for MVP. Organisers who need to change a participant's session must cancel that participant's active booking and create a new booking for the target session as two separate explicit operations.

---

## 7. API / Contract

### 7.1 Read contracts — RBAC-checked RLS

The read surface uses RBAC-checked RLS on `base_activity_booking`, following the same `check_rbac_permission_with_context` pattern as `base_application`.

**RLS policy (forward spec — migration required):**

```sql
-- base_activity_booking — SELECT:
check_rbac_permission_with_context(
  'read:page.bookings', 'bookings',
  organisation_id, event_id::text, get_app_id('BASE')
)

-- INSERT from authenticated client: DENIED — write path is RPC-only
-- UPDATE from authenticated client: DENIED — write path is RPC-only
-- DELETE from authenticated client: DENIED — write path is RPC-only
-- service_role: ALL (true)
```

**Booking list query:**

```
from('base_activity_booking')
.select(`
  id,
  event_id,
  session_id,
  application_id,
  status,
  source,
  booked_at,
  cancelled_at,
  override_reason,
  override_by,
  override_at,
  session:base_activity_session (
    id,
    session_name,
    start_time,
    end_time,
    offering:base_activity_offering (
      id,
      name
    )
  ),
  application:base_application (
    id,
    person:core_person (
      preferred_name,
      first_name,
      last_name
    )
  )
`)
.eq('event_id', selectedEvent.id)
.order('booked_at', { ascending: false })
```

**Error name on authorisation denial:** `base_booking_access_denied` (SQLSTATE `P0001` per BASE architecture RPC error convention).

**Approved applications query (participant selector for create-on-behalf):**

Permission posture: `base_application` is governed by its own RBAC-checked RLS (BA05a pattern — `check_rbac_permission_with_context` with `read:page.applications`). Any user who can read the bookings page and has `create:page.bookings` is expected to have read access to applications in scope. If the query returns an empty result (RLS denial), the Participant `Select` shows empty options with no error — the "Book on behalf" action is not actionable without approved participants, so no additional error state is needed.

```
from('base_application')
.select(`
  id,
  status,
  person:core_person (
    preferred_name,
    first_name,
    last_name
  )
`)
.eq('event_id', selectedEvent.id)
.eq('status', 'approved')
.order('person(last_name)', { ascending: true })
```

**Sessions query (session selector for create-on-behalf):**

Permission posture: `base_activity_session` is governed by RLS aligned with `check_rbac_permission_with_context` as per BA09 patterns (`read:page.activities` or equivalent session-read permission). If the query returns empty (RLS denial or no sessions exist), the Session `Select` shows empty options. Empty session list state: the Session field shows a disabled `Select` with placeholder "No sessions available for this event."

```
from('base_activity_session')
.select(`
  id,
  session_name,
  start_time,
  end_time,
  capacity,
  offering_id,
  offering:base_activity_offering (
    id,
    name
  )
`)
.eq('event_id', selectedEvent.id)
.order('start_time', { ascending: true })
```

### 7.2 Write contracts — RPC signatures

The following RPC signatures are the normative write contracts for BA11. They are reproduced verbatim from the v5 slice normative contract identifier map. Neither RPC is in dev-db — both are forward spec. Mutation surfaces are blocked until both are deployed.

#### `app_base_activity_booking_create`

```sql
-- Signature (forward spec — not in dev-db)
app_base_activity_booking_create(
  p_event_id               text,          -- selectedEvent.id
  p_application_id         uuid,          -- base_application.id for the selected participant
  p_session_id             uuid,          -- base_activity_session.id
  p_organisation_id        uuid,          -- resolved from event context
  p_source                 text,          -- 'admin_assigned' for all organiser create-on-behalf calls
  p_promote_from_waitlist  boolean,       -- true when promoting an active waitlisted booking to confirmed; suppresses duplicate-active-booking rejection
  p_override_capacity      boolean,       -- true when overriding capacity limit
  p_override_window        boolean,       -- true when overriding booking window
  p_override_conflict      boolean,       -- true when overriding session time conflict
  p_override_reason        text,          -- non-null, non-empty when any override flag is true; supplied by client
  p_override_by            uuid           -- auth.uid() when any override flag is true; supplied by client
  -- p_override_at: NOT a client parameter — set server-side by the RPC as now()
)
RETURNS jsonb  -- { booking_id: uuid, status: 'confirmed' | 'waitlisted' }
```

**Parameter note — `p_promote_from_waitlist`:** This flag is required for the manual waitlist promotion flow. Without it, calling `app_base_activity_booking_create` for a participant who already has a `waitlisted` booking in the same `(application_id, session_id)` pair would trigger the `base_booking_duplicate` failure. When `p_promote_from_waitlist = true`, the RPC transitions the active waitlisted row to `confirmed` instead of inserting a new row. The exact RPC-internal promotion mechanism (row update vs row replace) is a backend migration decision — the client contract is `p_promote_from_waitlist = true` signals promotion intent.

**Failure classes (RPC raises these on failure — catch at PostgREST error response, dispatch on `message` field):**

| Code | Condition |
|------|-----------|
| `base_booking_capacity_full` | Session at capacity and `p_override_capacity = false` |
| `base_booking_window_closed` | Outside booking window and `p_override_window = false` |
| `base_booking_duplicate` | Active booking already exists for this `(application_id, session_id)` |
| `base_booking_conflict` | Time conflict with existing active booking and `p_override_conflict = false` |
| `base_booking_override_reason_required` | Any override flag is true but `p_override_reason` is null or empty |
| `base_booking_application_not_found` | `p_application_id` does not exist or is out of event scope |
| `base_booking_session_not_found` | `p_session_id` does not exist or is out of event scope |
| `base_booking_access_denied` | Caller lacks `create:page.bookings` permission for the event scope |

#### `app_base_activity_booking_cancel`

```sql
-- Signature (forward spec — not in dev-db)
app_base_activity_booking_cancel(
  p_booking_id        uuid,          -- base_activity_booking.id
  p_cancelled_by      uuid,          -- auth.uid()
  p_source            text,          -- 'admin' for all organiser cancel calls
  p_reason            text,          -- null in v1 (no organiser cancel reason required)
  p_override_reason   text,          -- null in v1 (cancel is not override-eligible)
  p_override_by       uuid,          -- null in v1
  p_override_at       timestamptz    -- null in v1
)
RETURNS void
```

**Failure classes:**

| Code | Condition |
|------|-----------|
| `base_booking_not_found` | `p_booking_id` does not exist or is out of event scope |
| `base_booking_already_cancelled` | Booking is already `cancelled` |
| `base_booking_access_denied` | Caller lacks `delete:page.bookings` permission for the event scope |

### 7.3 Cross-slice handoffs

| Direction | Slice | What is exchanged |
|-----------|-------|-------------------|
| Consumes | **BA09** | `base_activity_offering` and `base_activity_session` table contracts — session selector for create-on-behalf, offering display on booking rows |
| Consumes | **BA10.contract** | `base_activity_booking` table contract including `status` enum (`confirmed | waitlisted | cancelled`), capacity counting rules, projection contracts |
| Consumes | **BA05a.contract** | `base_application` — participant identity and approved-applications query |
| Publishes | **BA11.contract** | `base_activity_booking` table contract — booking rows and status semantics, consumed by BA15 for `base.activity` reporting explore and by BA13 for scanning runtime validation |
| Downstream | **BA13** | BA13 scanning runtime validation consumes BA11.contract to confirm a participant has a valid `confirmed` booking before scanning |
| Downstream | **BA15** | BA15 reporting explore `base.activity` reads `base_activity_booking` via BA11.contract |

---

## 8. Data and schema references

| Artefact | Role | Status |
|----------|------|--------|
| **`base_activity_booking`** | Booking oversight root; columns: `id`, `event_id`, `session_id`, `application_id`, `status`, `source`, `booked_at timestamptz NOT NULL DEFAULT now()`, `cancelled_at timestamptz NULLABLE`, `override_reason`, `override_by`, `override_at`, `created_at`, `updated_at`, `created_by`, `updated_by`, `organisation_id` | In dev-db — confirmed (`rkytnffgmwnnmewevqgp`) |
| **`base_activity_session`** | Session display on booking rows; selector for create-on-behalf; `session_name text NULLABLE`. No `waitlist_enabled` column — waitlist flag lives on `base_activity_offering.allow_waitlist` | In dev-db — confirmed (`rkytnffgmwnnmewevqgp`) |
| **`base_activity_offering`** | Offering display on booking rows; `allow_waitlist boolean NOT NULL DEFAULT false` | In dev-db — confirmed (`rkytnffgmwnnmewevqgp`) |
| **`base_application`** | Approved-participant selector for create-on-behalf; `status = 'approved'` filter | In dev-db — confirmed per platform-snapshot-2026-05-11 |
| **`core_person`** | Participant display name (via `base_application` FK) | In dev-db |
| **`core_events`** | Event scope resolution; `organisation_id` for RPC calls | In dev-db |

**Schema ambiguity to track at build time:** the v5 RPC signature uses `p_application_id`, suggesting the booking links to a `base_application` record. BA10.contract uses `participant_id`. The exact FK column name on `base_activity_booking` must be confirmed when the migration is written. This is not a Phase 1 blocker — BA11 uses `application_id` as the canonical identifier per the v5 normative contract.

**Override audit fields (`override_reason`, `override_by`, `override_at`):** nullable columns on `base_activity_booking`; populated only when an override path is used. Presence of these columns on the live table should be confirmed at build time against the dev-db introspection.

---

## 9. pace-core2 imports

### §9.1 Imports table

| Symbol | Import path | One-line why |
|--------|-------------|--------------|
| `DataTable`, `DataTableColumn`, `DataTableAction`, `DataTableRBACConfig` | `@solvera/pace-core/components` | Booking oversight list |
| `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogBody`, `DialogFooter`, `DialogClose` | `@solvera/pace-core/components` | All confirmation and form dialogs |
| `Form`, `FormField` | `@solvera/pace-core/components` | Create-on-behalf and Override forms |
| `Button` | `@solvera/pace-core/components` | Row actions, dialog footers, booking action button |
| `Badge` | `@solvera/pace-core/components` | Status badges |
| `Select`, `SelectItem`, `SelectGroup`, `SelectLabel` | `@solvera/pace-core/components` | Participant and session selectors; filter controls |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription` | `@solvera/pace-core/components` | No-event-selected state |
| `Alert`, `AlertDescription` | `@solvera/pace-core/components` | Error states |
| `LoadingSpinner` | `@solvera/pace-core/components` | Loading states |
| `Checkbox` | `@solvera/pace-core/components` | Override checkboxes on create-on-behalf form |
| `SaveActions` | `@solvera/pace-core/components` | Create-on-behalf form footer (standard cancel + save) |
| `PagePermissionGuard`, `AccessDenied` | `@solvera/pace-core/rbac` | Route gating |
| `useSecureSupabase` | `@solvera/pace-core/rbac` | RLS-aware Supabase client |
| `useEvents` | `@solvera/pace-core/hooks` | `selectedEvent.id` event context |
| `useUnifiedAuth` | `@solvera/pace-core/hooks` | `auth.uid()` for `override_by` and `p_cancelled_by` |
| `useCan` | `@solvera/pace-core/rbac` | Permission-conditional rendering of buttons and row actions |
| `normalizeSupabaseError` | `@solvera/pace-core/utils` | Normalised error messages for toasts and Alerts |
| `formatDateTime` | `@solvera/pace-core/utils` | Consistent timestamptz display on booking rows |
| `toast` | `@solvera/pace-core/components` | Success and failure feedback |
| `EventId`, `OrganisationId`, `UserId` | `@solvera/pace-core/types` | Branded ID types at feature boundary |

### §9.2 Slice-specific caveats

**`SaveActions` — not suitable for Override Dialog footer**

`SaveActions` renders a "Save" button that cannot have its label overridden. For Override Dialog footers and cancel confirmation dialog footers, use explicit `Button variant="destructive"` and `Button variant="outline"` inside `DialogFooter` directly. `SaveActions` is appropriate only for the create-on-behalf form footer where the standard save label "Book" is acceptable (the label can be set via the `saveType` prop — confirm pace-core2 `SaveActions` label customisation before build).

**`useSecureSupabase()` returning null**

If `useSecureSupabase()` returns null (transient auth client initialisation), render a centred `LoadingSpinner` instead of fetching. Do not show an error state; the client resolves once auth state settles.

**`selectedEvent.id` — canonical field name**

`selectedEvent.id` is the canonical event identifier from `useEvents()`. Do not use `selectedEvent.event_id` — that field does not exist on `EventStub`.

---

## 10. Permission and access rules

| Surface | Permission | Enforcement |
|---------|-----------|-------------|
| Read booking list at `/activities/bookings` | `read:page.bookings` | `PagePermissionGuard` + RLS |
| "Book on behalf" button | `create:page.bookings` | `useCan` conditional render |
| Promote row action | `update:page.bookings` | `useCan` conditional render |
| Cancel row action | `delete:page.bookings` | `useCan` conditional render |
| Booking write (create, cancel) | Enforced by RPC — caller must hold appropriate permission for event scope | SECURITY DEFINER RPC checks; denials raise `base_booking_access_denied` |

---

## 11. Acceptance criteria

- Given an event with bookings, the booking list loads and displays correct status badges, participant names, session names, and offering names.
- Given `status = 'confirmed'`, the row shows `Badge variant='solid-main-normal'` "Confirmed".
- Given `status = 'waitlisted'`, the row shows `Badge variant='outline-acc-muted'` "Waitlisted" and the Promote row action is visible (when user has `update:page.bookings`).
- Given `status = 'cancelled'`, the row shows `Badge variant='outline-sec-muted'` "Cancelled" and no Cancel or Promote actions are visible.
- Given no event selected, the page shows the no-event-selected `Card` and the DataTable does not render.
- Given `read:page.bookings` denied, the route renders `AccessDenied`.
- Given a Supabase client null state, the page renders a centred `LoadingSpinner`.
- Given a booking fetch failure, the page renders an `Alert variant="destructive"` with a Retry control.
- Given the user lacks `create:page.bookings`, the "Book on behalf" button is not rendered.
- Given the user lacks `update:page.bookings`, the Promote row action is not rendered.
- Given the user lacks `delete:page.bookings`, the Cancel row action is not rendered.
- Given the create-on-behalf form is submitted with no override flags, the RPC is called without override parameters.
- Given an override checkbox is checked, the Override Dialog fires before the RPC is called; the confirm button is disabled until override reason is non-empty.
- Given override reason text is supplied and confirmed, the RPC is called with `p_override_reason` and `p_override_by` populated; `override_at` is set server-side (not by client).
- Given the Cancel confirmation is confirmed, the cancel RPC is called and the booking row updates to `cancelled`.
- Given the Promote dialog is confirmed and capacity is available, the booking is promoted to `confirmed`.
- Given the Promote dialog is triggered when the session is at capacity, the Override Dialog fires requiring an override reason.
- Given the participant selector, only `base_application` rows with `status = 'approved'` for the current event appear.

---

## 12. Verification

1. **Read surface (list):** Load `/activities/bookings` with BA18 seed bookings. Verify all columns render correctly — status badges match enum values, participant names resolved from `base_application` + `core_person`, session and offering names joined.
2. **Filter:** Apply status filter to `confirmed`; verify only confirmed rows appear. Apply session filter; verify scope narrows correctly.
3. **No-event state:** Deselect event; verify blocking `Card` appears and DataTable is not rendered.
4. **Access denied:** Test with a user lacking `read:page.bookings`; verify `AccessDenied` renders.
5. **Permission-conditional buttons:** Log in as a user with read-only `read:page.bookings`; verify "Book on behalf", Cancel, and Promote are not rendered.
6. **Create-on-behalf (blocked — pending RPC):** Once RPCs are deployed, verify: (a) participant selector shows only approved applications; (b) non-override path calls RPC without override fields; (c) override path fires Override Dialog and calls RPC with `p_override_reason` and `p_override_by` (client-supplied); verify `override_at` is set on the resulting booking row (server-set — not supplied by client).
7. **Cancel (blocked — pending RPC):** Once RPCs are deployed, verify: (a) cancel dialog shows participant and session context; (b) confirm calls cancel RPC; (c) cancelled booking no longer shows Cancel action.
8. **Promote (blocked — pending RPC):** Once RPCs are deployed, verify: (a) Promote appears only on `waitlisted` rows; (b) capacity-available path calls create RPC; (c) capacity-full path fires Override Dialog.
9. **Override audit fields:** Once RPCs are deployed, verify `override_reason` and `override_by` are persisted with client-supplied values on the `base_activity_booking` row after an override-path action; verify `override_at` is a server timestamp (not client clock) on the resulting row.
9a. **Already-cancelled race:** Simulate concurrent cancel: trigger the cancel dialog, have another session cancel the same booking, then confirm. Verify `base_booking_already_cancelled` error produces a destructive toast "This booking has already been cancelled." and the list refreshes.
10. **Seed dependency:** All non-empty verification scenarios use BA18 seed data.

---

## 13. Testing requirements

**Automated minimum**

- Unit tests: Status badge variant mapping for all three `status` values.
- Unit tests: Source label mapping for `self`, `admin_assigned`, and unknown values.
- Unit tests: Permission-conditional rendering — "Book on behalf" button, Promote row action, Cancel row action hidden/shown for each permission combination.
- Unit tests: Override Dialog disables confirm button when override reason is empty or whitespace.
- Integration test: Booking list query scoped to `event_id = selectedEvent.id`.
- Integration test: Participant selector query filters to `status = 'approved'` only.
- Integration test (blocked — pending RPC): Create-on-behalf happy path — non-override, verify RPC called with correct params.
- Integration test (blocked — pending RPC): Override path — verify `override_reason`, `override_by`, `override_at` passed to RPC.
- Integration test (blocked — pending RPC): Cancel happy path — verify cancel RPC called with `source = 'admin'`.
- Integration test (blocked — pending RPC): Promote happy path — capacity available, verify create RPC called with `source = 'admin_assigned'`.
- Permission tests: Denied routes render `AccessDenied`; denied actions are hidden.

---

## 14. Build execution rules

**Mutation surfaces (create-on-behalf, cancel, manual waitlist promotion) are blocked pending deployment of `app_base_activity_booking_create` and `app_base_activity_booking_cancel` to dev-db. Read/oversight surface builds independently.**

Specific blocking conditions:

- **Stop** on any mutation build if `app_base_activity_booking_create` is not deployed to dev-db with the signature documented in §7.2.
- **Stop** on cancel build if `app_base_activity_booking_cancel` is not deployed to dev-db with the signature documented in §7.2.
- **Stop** on booking list build if `base_activity_booking` RLS (RBAC-checked with `check_rbac_permission_with_context`) is not applied and confirmed.
- **Do not** implement direct client-side `base_activity_booking` INSERT, UPDATE, or DELETE operations. All writes go through the named RPCs.
- **Do not** re-implement capacity counting, duplicate detection, or booking window logic in client code. These are server-side RPC concerns.
- **Do not** add participant booking UI to the BASE app shell. All participant booking journeys are pace-portal routes (AD-001).
- **Do not** implement waitlist auto-promotion. Manual promotion via the "Promote" row action is in scope; background auto-promotion is not.
- **Do not** allow direct session reassignment (cancel + create in a single operation from one affordance). The two steps must be explicit and separate.
- **Do not** use `window.confirm()` anywhere.
- **Do not** ship hardcoded fixture booking rows in route code. All list/detail data comes from the approved Supabase query contracts in §7.1. Loading, empty, and error states handle no-data conditions.

---

## 15. Done criteria

- All §11 acceptance criteria verified with contract-level evidence (not pre-ticked).
- §12 verification flows completed for the read surface; mutation verification flows completed once RPCs are deployed.
- BA18 seed data confirmed available for non-empty booking list verification.
- QA pack at `docs/test-packs/BA11-qa-pack.md` executed; quality gates green.
- `BA11.contract` (`base_activity_booking` table contract — booking rows and status semantics) confirmed stable for BA13 and BA15 consumption.

---

## 16. Do not

- Do not add participant booking routes to the BASE app — pace-portal owns `/:eventSlug/activities` (AD-001).
- Do not execute `base_activity_booking` writes directly from client code — writes must go through `app_base_activity_booking_create` and `app_base_activity_booking_cancel` (AD-003).
- Do not re-implement booking business logic (capacity, duplicate detection, window checks, conflict detection) in client code — these are server-side RPC concerns.
- Do not implement direct session reassignment — the approved path is cancel + create as separate explicit operations.
- Do not implement waitlist auto-promotion — not in MVP scope.
- Do not skip the Override Dialog when an override flag is set — `override_reason` is required before any override-path RPC call.
- Do not render mutation action buttons for users without the corresponding permission.
- Do not ship hardcoded fixture booking rows in route code.
- Do not use the older `check_user_is_event_creator` RLS pattern for `base_activity_booking` — use `check_rbac_permission_with_context` with `get_app_id('BASE')`.
- Do not use `window.confirm()` for any confirmation flow.
- Do not omit error handling for RPC failure classes — each failure code in §7.2 must map to a distinct toast or inline error.

---

## 17. References

- `docs/requirements/BASE-architecture.md` — §6 Participant Activity Booking; route ownership (`/activities/bookings` → BA11); lane assignment (BASE overnight); hybrid slice targets (BA11.contract); AD-001; AD-003.
- `docs/requirements/BA09-activity-offering-setup-requirements.md` — `base_activity_offering` and `base_activity_session` table contracts; `check_rbac_permission_with_context` RLS pattern; offering/session selector query patterns.
- `docs/requirements/BA10-participant-booking-experience-requirements.md` — BA10.contract reference for `base_activity_booking` status enum and projection contracts.
- `docs/requirements/BA05a-registration-entry-and-application-submission-requirements.md` — `base_application` table contract; `approved` status query for participant selection.
- `docs/requirements/BA13-scanning-runtime-validation-requirements.md` — consumes BA11.contract for scanning runtime validation.
- `docs/requirements/BA15-reporting-requirements.md` — consumes BA11.contract for `base.activity` reporting explore.
- `docs/requirements/BA18-base-dev-seed-data-requirements.md` — seed data required for non-empty booking list verification.
