# BA01 — Event Workspace and Configuration

## 1. Slice metadata

- Status: Draft
- Depends on: BA00 (App Shell and Access)
- Backend impact: Read + write contracts; no schema changes
- Frontend impact: UI

## 2. Overview

This slice owns the authenticated organiser's entry surface for working inside a single event. It delivers two routes: an event dashboard that surfaces the selected event's identity and a fixed set of operational nav cards into other BASE bounded contexts, and an event configuration form that edits a defined subset of `core_events` fields. It is the first slice that depends on the shared shell from BA00 and the first surface that consumes event-scoped context.

## 3. What this slice delivers

### 3.1 Event Dashboard (`/event-dashboard`)

**Purpose.** Show the operator the event they are currently working inside, and provide a navigation hub into BASE bounded contexts that are scoped to that event.

**Surfaces.**
- The `/event-dashboard` route, rendered inside the BA00 authenticated shell.
- A page header (h1 + subtitle).
- An event identity card (event name, dates, venue, logo) shown only when an event is selected.
- A responsive grid of five nav cards (Forms, Applications, Registration Types, Reports, Communications), each linking to a sibling slice's owned route.

**Boundaries.**
- This slice does not own the global event picker — that lives in the BA00 shell and is consumed via `useEvents()`.
- This slice does not own any of the routes the nav cards link to (Forms, Applications, Registration Types, Reports, Communications). It only renders cards with live counts and link affordances; clicking navigates out of the slice.
- This slice does not own role granting or revocation. It consumes permission state via `PagePermissionGuard` only.

**Architectural posture.**
- Import policy is root-first for consuming apps: use `@solvera/pace-core` as the default import surface. Scoped entrypoints (for example `/rbac`, `/hooks`, `/components`, `/forms`) are exception-only and used only when the root export does not expose the required symbol or a documented advanced/performance/migration case requires the scoped path.
- Event selection is shell-owned: read selected event from `useEvents()`. Do not implement page-local event selection.
- Counts on nav cards are fetched through BA01-owned data hooks/services that use the secure Supabase boundary (`useSecureSupabase()`). Route/page components must not contain inline data-access queries.
- Permission gating uses `PagePermissionGuard` from `@solvera/pace-core/rbac` with `pageName`, `operation`, `scope`, and `fallback` props. `useCan` is retired and must not be used.
- Page is wrapped by `PagePermissionGuard` for the page-level read check. Evaluation order: the guard is the outermost wrapper; the no-event empty state (D-ES-01) renders inside the guard's children. When no event is selected, `selectedEventId` is null and the scope passed to the guard contains `eventId: null`. The guard still evaluates normally — `read:page.event-dashboard` is a page-level permission, not event-scoped, so a null `eventId` in scope does not block the permission check. A user who passes the check sees the no-event empty message; a user who fails it sees `<AccessDenied />` regardless of event state.

### 3.2 Event Configuration (`/configuration`)

**Purpose.** Allow an organiser with update permission to view and edit the approved business-facing fields of the selected event.

**Surfaces.**
- The `/configuration` route, rendered inside the BA00 authenticated shell.
- A loading state covering the whole page while initial event data fetches.
- A no-event state when no event is selected.
- The configuration form rendered as two cards: a main "Event Configuration" card (most fields) and an "Event Styling" card (logo display + upload + colours JSON).

**Boundaries.**
- This slice does not own catering, news, round-down, or youth-multiplier fields (CAKE-owned, lives in a separate app's slice).
- This slice does not own any participant-facing fields (`participant_blurb`, `participant_admin_email`, `participant_website_url`) — those are owned by pace-portal.
- This slice does not own `event_billing` (system-managed).
- This slice does not own `public_readable` (deprecated; not surfaced).
- This slice does not own the global event picker.
- This slice does not own org-level event provisioning (event creation, deletion, lifecycle transitions).

**Architectural posture.**
- Import policy is root-first for consuming apps: use `@solvera/pace-core` as the default import surface. Scoped entrypoints (for example `/rbac`, `/hooks`, `/components`, `/forms`) are exception-only and used only when the root export does not expose the required symbol or a documented advanced/performance/migration case requires the scoped path.
- Form implementation uses pace-core form surfaces (`Form` component contract + `useZodForm` from `@solvera/pace-core/hooks`). BA01 consuming-app implementation code must not directly import `react-hook-form` or `zod`; use pace-core form contracts and BA01 form modules.
- Mutation goes through BA01-owned mutation hooks/services that use the secure Supabase boundary (`useSecureSupabase()`); writes target the documented `core_events` update contract; no schema changes are introduced by this slice.
- File operations use `FileUpload` and `FileDisplay` from `@solvera/pace-core/components`. `FileUpload` requires the `supabase` prop sourced from `useSecureSupabase()`. `FileDisplay` accepts a `fileReference: FileReference` (resolved via the event pointer model in §6.13) or a direct `url`; it does not accept scoping props. When no `FileReference` exists, the logo fallback (initials abbreviation per §6.5) is rendered separately — `FileDisplay` is not rendered. After a successful upload, `onUploadSuccess` provides `FileUploadResult.file_reference`; BA01 then persists `core_events.logo_id` to that reference id and only then updates local `logoRef` state from the same file reference. No `key`-prop re-mount pattern is required.
- Address input uses `AddressField` from `@solvera/pace-core/forms`. Wire with `control={form.control}`, `name="event_venue"`, `meta={{ id: 'event_venue', fieldType: 'address', label: 'Event Venue', required: false }}`, and `provider={createGoogleMapsJsAddressProviderAdapter()}`. The form field value type is `AddressValue | undefined`. Serialize to a string in the save handler per §6.3.
- Date input uses `DatePickerWithTimezone` from `@solvera/pace-core/components` with props `value` (Date | null) and `onChange` ((date: Date) => void). Do not pass `showTimezoneSelector` — the default date-only mode is correct for `event_date`. The caller is responsible for converting the selected `Date` to midnight UTC in the save payload per §6.2.
- Boolean toggles use `Switch` (not `Checkbox`).
- Page permission guard: `/configuration` is wrapped at the outermost level by `PagePermissionGuard pageName="configuration" operation="read"`. Evaluation order: the guard fires first; the no-event empty state (C-NC-01) and the loading state (C-LS-01) both render inside the guard's children. When no event is selected, `selectedEventId` is null and the scope contains `eventId: null`; the guard still evaluates normally since `read:page.configuration` is a page-level permission. A user who passes the check sees the no-event or loading state as appropriate; a user who fails it sees `<AccessDenied />` regardless of event state.
- The save button is wrapped in `PagePermissionGuard pageName="configuration" operation="update" fallback={null}` (hidden when denied). The logo upload control is similarly wrapped. The editable form content is also wrapped in `PagePermissionGuard pageName="configuration" operation="update"` where the `fallback` renders all form fields with `disabled={true}` and the `children` renders fields as editable.

## 4. Functional specification

Items numbered with prefix `D-` belong to the Event Dashboard surface; items prefixed `C-` belong to the Event Configuration surface. Each item is independently testable.

### 4.1 Event Dashboard — `/event-dashboard`

**Page entry**
1. D-PE-01 — On entry, the page renders inside the authenticated BA00 shell. Event context is read from the shell's `useEvents()` hook. The URL is `/event-dashboard`.
2. D-PE-02 — Page header displays an h1 reading "Event Dashboard" and a subtitle reading "Manage this event's settings, forms, applications, and reporting."

**Loading states**
3. D-LS-01 — While nav-card live counts (Forms, Applications, Registration Types) are still loading, each loading count renders as `…` (ellipsis) in the count slot. Other nav-card content (icon, title, description) renders immediately.

**Empty states**
4. D-ES-01 — When no event is selected (no `selectedEvent` from `useEvents()`), the event identity card is hidden, the nav cards grid is hidden, and a single message renders centred in the content area: "Select an event from the header to begin."

**Error states**
5. D-ER-01 — If a count query fails, the affected card renders `—` (em-dash) in the count slot rather than `…`, and the rest of the dashboard remains usable.

**Primary content — Event identity card** (rendered only when an event is selected)
6. D-PC-01 — Card title: the event's `event_name`.
7. D-PC-02 — Start date with a Calendar icon, formatted via `formatDate` from `@solvera/pace-core` (e.g. "5 Apr 2026"). When `event_date` is null, displays "No date set".
8. D-PC-03 — End date displayed alongside start date, computed per the rule in §6.1. When start date is null, no end date is shown. Single-day events display only the start date.
9. D-PC-04 — Venue with a MapPin icon, rendered as plain text from `event_venue`.
10. D-PC-05 — Event logo on the right-hand side of the card. A `logoRef: FileReference | null` state is loaded on dashboard entry via the pointer model in §6.13 (`core_events.logo_id` -> `core_file_references.id`, constrained to `is_public = true`). When `logoRef` is not null, render `<FileDisplay fileReference={logoRef} supabase={secureSupabase} bucket="files" variant="inline" className="h-48 w-full" label="Event logo" />`. In the current pace-core contract, `variant="inline"` renders an inline download/view link container (not an `<img>` element). When `logoRef` is null, render the fallback placeholder per D-PC-06.
11. D-PC-06 — When no logo `FileReference` exists, render a centred placeholder container (same dimensions as the logo area) containing the 3-letter abbreviation generated per the rule in §6.5. The abbreviation is displayed in a styled pill or avatar element — not via `FileDisplay`.

**Primary content — Nav cards grid**
12. D-PC-07 — Five nav cards rendered in a responsive grid (rule in §6.10):
    1. Forms — links to `/forms`. Live count from `core_forms` filtered by selected event id.
    2. Applications — links to `/applications`. Live count from `base_application` filtered by selected event id.
    3. Registration Types — links to `/registration-types`. Live count from `base_registration_type` filtered by selected event id.
    4. Reports — links to `/reports`. No live count.
    5. Communications — links to `/communications`. No live count.
13. D-PC-08 — Each nav card displays: an icon in the card header (icons: Forms = `Check`, Applications = `FileText`, Registration Types = `Calendar`, Reports = `BarChart`, Communications = `Mail`), a card title, the card's live count (if applicable) in accent colour, and a descriptive sentence (one line) about the destination's purpose.

**Primary actions**
14. D-PA-01 — Each nav card is fully clickable (entire card is the link target) and navigates to the destination route on click. Hover state highlights the card border.

**Secondary actions**
15. N/A — There are no secondary actions on this surface.

**Permission-conditional rendering**
16. D-PR-01 — The page is wrapped in `PagePermissionGuard` with `pageName="event-dashboard"`, `operation="read"`, and `scope={{ organisationId, eventId, appId }}` (per §6.10). If denied, the page renders pace-core2's `<AccessDenied />` and no other content.
17. D-PR-02 — Individual nav cards are not permission-gated at the card level in this slice. Permission gating for the destinations is owned by the destination slice's page guard.

**Navigation**
18. D-NV-01 — Clicking any nav card navigates to that card's destination route via the standard React Router link affordance. Event context is maintained by the shell across the navigation.

**Edge cases and constraints**
19. D-EC-01 — When `selectedEvent` is set but `organisation_id` cannot be resolved from it, the event identity card renders normally including the logo block. The logo pointer read (§6.13) keys on `selectedEventId` and `core_events.logo_id` — it does not require `organisation_id`. The `organisationId: null` in the `PagePermissionGuard` scope object may affect permission evaluation, but does not suppress the identity card or logo display.
20. D-EC-02 — Counts displayed on nav cards reflect the count of all rows in the underlying table filtered by the selected event id, regardless of row status. Filtering by status (e.g. only "active" forms) is not applied at this surface — destination slices apply their own filtering on landing.

### 4.2 Event Configuration — `/configuration`

**Page entry**
21. C-PE-01 — On entry, the page renders inside the authenticated BA00 shell. The URL is `/configuration`. The page reads the selected event from `useEvents()` and fetches the event row from `core_events` via `useSecureSupabase()`.
21. C-PE-01 — On entry, the page renders inside the authenticated BA00 shell. The URL is `/configuration`. The page reads the selected event from `useEvents()` and obtains configuration data through BA01-owned read hooks/services that encapsulate secure Supabase access.

**Loading states**
22. C-LS-01 — While the initial event row is being fetched, the entire content area renders a centred `LoadingSpinner` from `@solvera/pace-core/components` with the copy "Loading event data…" beneath it. No form content renders during loading.

**Empty / no-context states**
23. C-NC-01 — When no event is selected (no `selectedEvent` from `useEvents()`), the form does not render. Instead, a single message renders: "No event selected. Choose an event from the header to begin."

**Error states**
24. C-ER-01 — If the event read fails (network error, RLS denial that resolved past the page guard, missing row), the page renders an error message in place of the form: a destructive-variant alert with the normalised error message (obtained via `NormalizeSupabaseError(error).message`) and no further form content. The page header card still renders.

**Primary content — page header card**
25. C-PC-01 — At the top of the form area, a card renders containing a title "Event Configuration" prefixed with a Calendar icon, plus a one-line subtitle reading `"Editing: {event_name}"` where `{event_name}` is the loaded event's name.

**Primary content — Main configuration card**
The card's content body contains the following fields, in the order listed, grouped per the layout rule in §6.11.

26. C-PC-02 — Field "Event Name". Required text input. Maps to `core_events.event_name`. Validation per §6.6.
27. C-PC-03 — Field "Event Code". Optional text input. Maps to `core_events.event_code`. Validation per §6.6.
28. C-PC-04 — Field "Event Date". Date picker using `DatePickerWithTimezone` with props `value` (Date | null) and `onChange` ((date: Date) => void). Maps to `core_events.event_date`. Integrate through the pace-core form contract (`Form` + `useZodForm`) without direct `react-hook-form` imports in route/page files. Do not pass `showTimezoneSelector` — date-only mode is correct. Storage rule per §6.2.
29. C-PC-05 — Field "Event Days". Number input, integer, min 1, max 365, default 1. Maps to `core_events.event_days`.
30. C-PC-06 — Field "Event Email". Optional email input. Maps to `core_events.event_email`. Validation per §6.6.
31. C-PC-07 — Field "Event Venue". Address input via `AddressField` with `meta={{ id: 'event_venue', fieldType: 'address', label: 'Event Venue', required: false }}`, `control={form.control}`, `name="event_venue"`, `provider={createGoogleMapsJsAddressProviderAdapter()}`. The component wraps `Controller` internally. The form value type is `AddressValue | undefined`; serialised to a plain string in the save handler per §6.3. Maps to `core_events.event_venue`.
32. C-PC-08 — Field "Expected Participants". Number input, integer, min 0, default 0. Maps to `core_events.expected_participants`.
33. C-PC-09 — Field "Typical Unit Size". Number input, integer, min 0, default 0. Maps to `core_events.typical_unit_size`.
34. C-PC-10 — Field "Event Description". Multi-line textarea (4 rows initial), optional, max 5000 chars. Maps to `core_events.description`.
35. C-PC-11 — Field "Registration Scope". Required Select with three options (`Org only` / `Hierarchy` / `Open`). Maps to `core_events.registration_scope`. Allowed-value rule per §6.7.
36. C-PC-12 — Field "Event is visible". Switch (boolean), default true. Maps to `core_events.is_visible`.

**Primary content — Event Styling card**
37. C-PC-13 — A two-column section (per §6.11). Left column: logo display area managed per §6.13. When `logoRef` (state) is not null, render `<FileDisplay fileReference={logoRef} supabase={secureSupabase} bucket="files" variant="inline" className="h-48 w-full" label="Event logo" />`. In the current pace-core contract, `variant="inline"` renders an inline download/view link container (not an `<img>` element). When `logoRef` is null, render a styled fallback placeholder (same dimensions) containing the abbreviated event name per §6.5. Right column: logo upload via `FileUpload` (wrapped in `PagePermissionGuard pageName="configuration" operation="update" fallback={null}`).
38. C-PC-14 — Below the logo section: field "Event Colours (JSON)". Multi-line textarea (4 rows initial). Helper text reads "Enter valid JSON format for event colours". Placeholder reads `{"primary": "#000000", "secondary": "#ffffff"}`. Validation rule per §6.8.

**Primary actions**
39. C-PA-01 — A "Save" button is rendered at the bottom-right of the main configuration card. Minimum width 120px. Wrapped in `PagePermissionGuard` with `pageName="configuration"`, `operation="update"`, and `fallback={null}` (button hidden if not authorised).
40. C-PA-02 — On click of "Save": form values are validated via the BA01 validation contract in §6.6 (implemented through pace-core form patterns). If invalid: a destructive toast appears with title "Validation Error" and the formatted validation error as the body; submission aborts; field-level errors are surfaced inline beneath the failing fields. If valid: the values are written to `core_events` via BA01 mutation hooks/services that encapsulate `useSecureSupabase()` per §6.9. While the write is in flight, the button label becomes "Saving…" and the button is disabled.
41. C-PA-03 — On successful save: a success-variant toast appears with title "Success" and body "Event saved successfully!". The form values remain populated with the saved data; the page does not reload event data from the database.
42. C-PA-04 — On save error: call `HandleMutationError(error, 'event-configuration-save', toast)` which normalises the error and fires a destructive-variant toast automatically. The form remains editable; the user can retry.
43. C-PA-05 — On logo upload via the `FileUpload` control: `onUploadSuccess` fires with `FileUploadResult`; BA01 persists `core_events.logo_id = result.file_reference.id` immediately (service/hook layer), then sets local state `setLogoRef(result.file_reference)` so `FileDisplay` re-renders. If pointer persistence fails, BA01 does not apply local logo state and shows an error. A success-variant toast "Logo uploaded successfully!" appears after pointer persistence succeeds. `onUploadError` fires with an `Error` object on failure; show a destructive toast "Failed to upload logo: {error.message}"; the previously-displayed logo (existing `logoRef` state) remains unchanged.

**Secondary actions**
44. N/A — There are no secondary actions on this surface in this slice.

**Permission-conditional rendering**
45. C-PR-01 — The page is wrapped in `PagePermissionGuard` with `pageName="configuration"`, `operation="read"`, and `scope={{ organisationId, eventId, appId }}`. If denied, renders `<AccessDenied />` and no form content.
46. C-PR-02 — The form fields section is wrapped in `PagePermissionGuard` with `pageName="configuration"`, `operation="update"`, and `scope={{ organisationId, eventId, appId }}`:
    - `children` renders all form fields in their editable state.
    - `fallback` renders all form fields with `disabled={true}` on each input and the "Save" button absent.
    When update permission is denied, the fallback also ensures the `FileUpload` control is hidden (per C-PR-03) and the `FileDisplay` remains visible.
47. C-PR-03 — The `FileUpload` control is wrapped in `PagePermissionGuard` with `pageName="configuration"`, `operation="update"`, and `fallback={null}`.

**Navigation**
48. C-NV-01 — The page does not navigate away on save. The configuration page is reachable from the shell sidebar; navigation back to the dashboard is via the shell, not via in-page links.

**Edge cases and constraints**
49. C-EC-01 — If `event_id` resolves but `organisation_id` cannot be derived from the loaded event, `FileDisplay` and `FileUpload` still render. `FileDisplay` uses `fileReference` resolved through the pointer read (`core_events.logo_id` -> `core_file_references.id` with `is_public = true`), keyed by `selectedEventId` and not requiring `organisation_id`. `FileUpload` uses `record_id={eventId}`, `event_id={eventId}`, `organisation_id={organisationId}`, and `app_id={appId}` per the current pace-core `FileUploadOptions` contract. The `organisationId: null` in the `PagePermissionGuard` scope may affect update-permission checks, but does not hide the file controls. If `appId` is still unresolved after RBAC scope loading, the `FileUpload` renders a static notice per C-EC-02.
50. C-EC-02 — While RBAC scope is loading, the `FileUpload` control renders a static notice "Loading app configuration…". If scope loading completes and `appId` remains unresolved, render "App configuration unavailable." instead of the upload UI; other form fields remain editable.
51. C-EC-03 — Stale or concurrent edits are not specially handled in this slice (last write wins). The slice does not surface optimistic-locking errors.
52. C-EC-04 — Empty / null handling: every optional field accepts an empty input which is normalised to null in the database write. `event_name` is required and rejects empty / whitespace-only values.

## 5. Visual specification

- Visual scope is `/event-dashboard` and `/configuration` only.
- Keep this section to layout/state rendering; persistence and permission contracts remain in §4/§7.
- Nav-count and guard outcomes are visual results of existing contracts.

## 6. Business rules

### 6.1 End-date computation (display-only)
- **Inputs:** `event_date` (date or null), `event_days` (integer ≥ 1, default 1).
- **Output:** displayed end date = `event_date + interval '1 day' * (event_days - 1)`.
- **Edge cases:**
  - `event_date` null → no end date displayed.
  - `event_days = 1` → end date equals start date; display only the start date (omit the end date line).
  - `event_days < 1` → not possible per validation (§6.6) but if encountered, treat as 1.

### 6.2 Event date storage (write side)
- **Inputs:** user input as `Date` object from `DatePickerWithTimezone`'s `onChange` callback (prop name `onChange: (date: Date) => void`; prop for current value is `value: Date | null`).
- **Output (DB):** ISO 8601 datetime string at midnight UTC. Apply the transform in the save handler: `new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString()`. The component does not apply this transform automatically.
- **Edge cases:** when the field is cleared, `value` becomes null; store null in DB.

### 6.3 Event venue storage
- **Inputs:** `AddressValue` value from the form field `event_venue` (type `AddressValue | undefined`; `AddressField` stores this internally via RHF `Controller`). `AddressValue` shape: `{ line1: string, line2?: string, locality: string, region?: string, postalCode?: string, countryCode: string, placeId?: string, formattedAddress?: string }`.
- **Output (DB):** plain string — in the save handler, serialise: `formValues.event_venue?.formattedAddress ?? null`. If `formattedAddress` is not populated (e.g. manual entry without Google Places selection), store null.
- **Read side:** `event_venue` is read from `core_events` as a plain string and used directly for display. No parsing is applied — the read value is display-only text on the dashboard card and does not need to reconstruct an `AddressValue`.
- **Edge cases:** empty venue allowed (null in DB). If the field is cleared, the form value is `undefined`; store null.

### 6.4 Logo upload constraints
- **Accepted MIME types:** `image/*` (via `accept="image/*"` prop on `FileUpload`).
- **Maximum file size:** 5 MB (`5 * 1024 * 1024` bytes; via `maxSize` prop on `FileUpload`).
- **FileUpload required props:** `supabase` (storage-capable Supabase client), `bucket="files"`, `table_name="core_events"`, `record_id={eventId}`, `organisation_id={organisationId}`, `event_id={eventId}`, `app_id={appId}`, `category="event_logos"`. `is_public={true}` remains optional. `folder` and `pageContext` are optional telemetry metadata and are not required for canonical key generation.
- **Validation:** files exceeding the size limit or with non-image MIME types are rejected by the `FileUpload` component before any mutation; `logoRef` state is not updated.
- **Display update after upload:** in the `onUploadSuccess` callback, call `setLogoRef(result.file_reference)`. `FileDisplay` re-renders with the new `FileReference` automatically — no `key` re-mount or artificial delay required.
- **Upload error:** `onUploadError` callback receives `(error: Error)`. Show a destructive toast: `"Failed to upload logo: {error.message}"`; `logoRef` state unchanged.

### 6.5 Logo fallback rule (display)
- **Inputs:** `event_name` string (may be empty).
- **Output:** a 1–3 character abbreviation rendered in a separately constructed placeholder element. `FileDisplay` is not rendered when `logoRef` is null — the fallback is a standalone `<div>` per §3.2 and D-PC-06. Do not use `FileDisplay`'s internal fallback mechanism.
- **Algorithm:**
  1. If `event_name` is empty or null, return `"EV"`.
  2. Else split `event_name` on the regex `/[\s\-_]+/`.
  3. For each token, take the first character and uppercase it.
  4. Join the uppercased initials.
  5. Take the first 3 characters of the result.
- **Examples:**
  - `"Awesome Event 2026"` → tokens `["Awesome", "Event", "2026"]` → `"AE2"`.
  - `"single-word"` → tokens `["single", "word"]` → `"SW"`.
  - `"X"` → `"X"`.
  - `""` → `"EV"`.

### 6.6 Field validation rules (BA01 validation contract)
The BA01 form implementation uses `useZodForm` with pace-core `Form` surfaces. Validation logic is owned by BA01 feature-form modules (not route/page files). Errors are surfaced inline beneath each field on submit; a single "Validation Error" toast also appears summarising the issues.

| Field | Rule |
|-------|------|
| `event_name` | required string, trimmed, min 1, max 255; empty / whitespace-only rejected with "Event name is required". |
| `event_code` | optional, nullable string; if present must match `/^[A-Z0-9-]+$/`, max 50; "Event code can only contain uppercase letters, numbers, and hyphens" / "Event code cannot exceed 50 characters". |
| `event_email` | optional, nullable string; if present must pass email format check and max 254 characters. |
| `event_date` | optional, nullable; accepts a `Date` object from the picker (converted to ISO string in the save payload per §6.2). |
| `event_days` | integer, min 1, max 365, default 1; "Event days must be at least 1" / "Event days cannot exceed 365". |
| `event_venue` | `AddressValue` shape (`addressValueSchemaRequired.optional()` from `@solvera/pace-core/forms`); optional. The form field holds a structured `AddressValue`; the save handler serialises to a plain string per §6.3. |
| `expected_participants` | integer, min 0, default 0; "Participants cannot be negative". |
| `typical_unit_size` | integer, min 0, default 0. |
| `description` | optional, nullable; max 5000 chars. |
| `registration_scope` | required; one of `'org_only'`, `'hierarchy'`, `'open'`; "Registration scope is required". |
| `is_visible` | boolean, default true. |
| `event_colours` | optional, nullable string; JSON validity checked separately per §6.8. |

### 6.7 Registration scope allowed values and meanings
The Registration Scope select offers exactly three options:

| Persisted value | Display label | Meaning |
|-----------------|---------------|---------|
| `org_only` | Org only | A person must have a `core_member` record for the event's organisation in order to register. |
| `hierarchy` | Hierarchy | A person must have a `core_member` record for any organisation in the event organisation's hierarchy (above or below). |
| `open` | Open | Any person whose org sits anywhere under the root org may register. |

Select renders these as `SelectItem` rows in the order shown. The field is required; no default — the user must explicitly pick one.

### 6.8 Event Colours JSON validation
- **Inputs:** raw textarea string.
- **Output (DB):** parsed JSON value stored in `core_events.event_colours` (jsonb), or null when input is empty / whitespace-only.
- **Validation:**
  - Empty / whitespace input → null in DB; no error.
  - Non-empty input: validate `input.length ≤ 5000`. If exceeded, abort save with destructive toast title "Error" and body "Event Colours JSON exceeds maximum length of 5000 characters".
  - Parse using `JSON.parse(input)` wrapped in a `try/catch` block.
  - On `SyntaxError`: abort save with destructive toast title "Error" and body `"Invalid JSON in Event Colours field: {error.message}"`.
  - On valid parse: store the parsed JSON value in `core_events.event_colours`.
- **Note:** A `parseSafeJSON` utility does not currently exist in pace-core2. The JSON validation/parse step is implemented in BA01 feature form logic (not inline in page-route components).

### 6.9 Save flow
- **Trigger:** user clicks "Save".
- **Steps:**
  1. Run Zod validation per §6.6. On failure, surface inline errors and "Validation Error" toast; abort.
  2. Run colours JSON validation per §6.8. On failure, abort.
  3. Build the update payload: validated field values. Apply the midnight-UTC transform to `event_date` (per §6.2). Serialise `event_venue` from `AddressValue | undefined` to `string | null` (per §6.3): `event_venue: formValues.event_venue?.formattedAddress ?? null`. Append `updated_at = new Date().toISOString()` and `updated_by = user.id` (from `useUnifiedAuth().user.id`).
  4. Invoke the BA01 save mutation hook/service, which performs `secureSupabase.from('core_events').update(payload).eq('event_id', eventId).select('event_name, event_code, event_email, event_date, event_days, event_venue, expected_participants, typical_unit_size, registration_scope, event_colours, is_visible, description, updated_at, updated_by')`.
  5. On error: call `HandleMutationError(error, 'event-configuration-save', toast)` — normalises the error and fires a destructive-variant toast automatically. Form values unchanged.
  6. On success: show a success toast "Event saved successfully!" via `ShowSuccessMessage('Event saved successfully!', toast)`. Form values remain as submitted (no DB re-fetch required).
- **Note:** No client-side permission pre-flight is performed. `PagePermissionGuard` hides the save button when update permission is denied; RLS enforces the constraint at the server level.

### 6.10 Permission action keys and convention
- Convention: `'<action>:page.<page-name>'`. This string is constructed internally by `PagePermissionGuard` from its `pageName` and `operation` props — do not construct or pass it directly.
- `PagePermissionGuard` is always called with `pageName`, `operation`, `scope`, and optionally `fallback` props.
- `useCan` is retired and must not be used in this slice.
- Keys used in this slice (as `pageName` / `operation` pairs):
  - `pageName="event-dashboard"` / `operation="read"` — wraps the `/event-dashboard` page.
  - `pageName="configuration"` / `operation="read"` — wraps the `/configuration` page.
  - `pageName="configuration"` / `operation="update"` — wraps the save button, the `FileUpload` control, and the editable form content on `/configuration`.
- Scope object construction: `{ organisationId, eventId, appId }` where:
  - `organisationId` — resolved from RBAC scope APIs (`useResolvedScope().organisationId`), with auth-selected organisation as fallback where feature semantics require it.
  - `eventId` — resolved from RBAC scope APIs (`useResolvedScope().eventId`), with auth-selected event as fallback where feature semantics require it.
  - `appId` — resolved from RBAC scope APIs (`useResolvedScope().appId` or `useRBAC()` scope), not from `useUnifiedAuth()`.

### 6.11 Layout rules
- Dashboard nav cards grid: `grid-cols-1` at `< 768px`, `md:grid-cols-2` at `>= 768px`, `lg:grid-cols-3` at `>= 1024px`.
- Configuration form paired-field rows: `grid-cols-1` at `< 768px`, `md:grid-cols-2` at `>= 768px`. Applied to: name+code, date+days, email+venue, participants+typical-unit-size.
- Configuration logo section: `grid-cols-1` at `< 768px`, `md:grid-cols-2` at `>= 768px` (display | upload).

### 6.12 Error message formatting
- **Rule:** all mutation errors and event-read errors displayed to the user must be normalised via pace-core2 utilities rather than using raw error message strings.
- **For save and upload errors where a toast is required:** call `HandleMutationError(error, contextString, toast)`. This normalises the error, logs it, and fires a destructive toast automatically via the passed `toast` function.
  - `contextString` identifies the operation for logging (e.g. `'event-configuration-save'`, `'event-logo-upload'`).
  - `toast` is the `ToastFn` returned by `useToast()`.
- **For inline error display (no toast):** call `NormalizeSupabaseError(error).message` to get a sanitised user-facing string without side effects.
- **Import:** `HandleMutationError`, `NormalizeSupabaseError` from `@solvera/pace-core/utils` (see §9).
- **No `getUserFriendlyErrorMessage` utility exists in pace-core2.** Do not import or reference it.

### 6.13 Logo FileReference management
- **State:** both `/event-dashboard` and `/configuration` maintain a `logoRef: FileReference | null` state variable for the current event logo.
- **Initial load (pointer model):** on entry to each route (once `selectedEventId` is known), resolve pointer and target row in two steps:
  1. Read `core_events.logo_id` for the selected event id.
  2. If `logo_id` is non-null, read that exact `core_file_references` row by `id` with `is_public = true`.
  If `logo_id` is null, stale, or points to a non-public/missing row, set `logoRef` to `null` and render fallback.
- **Pointer write on upload:** after successful `FileUpload`, BA01 updates `core_events.logo_id` to the uploaded `result.file_reference.id` in the BA01 service/hook layer. Only after pointer persistence succeeds should local `logoRef` be updated from `result.file_reference`.
- **Display:** pass `logoRef` to `FileDisplay` as `fileReference={logoRef}` with `supabase={secureSupabase}`, `bucket="files"`, `variant="inline"`, and `label="Event logo"`. `variant="inline"` renders an inline download/view link container rather than an embedded image element. When `logoRef` is null, render the abbreviation fallback per §6.5.
- **Error handling:** if the `core_file_references` query fails, set `logoRef` to null (show the abbreviation fallback). This is a non-blocking failure — the main page content remains usable. No error toast for this specific failure.

## 7. API / Contract

### 7.1 Read contracts

**Event read** (used by `/configuration` entry flow)
- Source: BA01 read hook/service backed by `useSecureSupabase().from('core_events').select(...).eq('event_id', selectedEventId).single()`.
- Selected columns: `event_id, event_name, event_code, event_email, event_date, event_days, event_venue, expected_participants, typical_unit_size, event_colours, is_visible, organisation_id, description, registration_scope, created_at, created_by, updated_at, updated_by`.
- Result shape: a single row object with all selected columns, or `null` if none / RLS denies.

**Selected event read** (used by `/event-dashboard`)
- Source: `useEvents().selectedEvent` from BA00 shell context. Type: `EventStub` from `@solvera/pace-core/types`, or null. `EventStub` is an open interface (`[key: string]: unknown`) with a canonical `id: string` property. The BASE consuming app extends this with `core_events` columns.
- Properties used by this slice (read via the open type shape — verify field names match the BASE event service implementation at build time):
  - `event_name: string` — identity card title and logo fallback input.
  - `event_date?: string` — identity card date display.
  - `event_days?: number` — end-date computation per §6.1.
  - `event_venue?: string` — identity card venue display.
- **Count query filters and scope event ID:** use `useUnifiedAuth().selectedEventId` (the typed canonical event ID from auth context) rather than reading `selectedEvent.event_id`. This is a `string | null` value already resolved by the auth provider.
- Note: The pace-core2 `EventStub` type uses `id: string` as its canonical identifier. The BASE event shape from `core_events` uses `event_id` as the DB column. The BASE EventService implementation maps these. Verify the actual field name during implementation and do not assume `selectedEvent.event_id` without confirming the BASE event type definition (§8.3 verification item).

**Logo FileReference read** (used by both routes on entry)
- Source: pointer model per §6.13 (`core_events.logo_id` then `core_file_references` by id + `is_public = true`). Run once per route entry when `selectedEventId` is known.
- Result: `FileReference | null` stored in `logoRef` state.

**Live count reads** (used by `/event-dashboard`)
- Source: BA01 count hooks/services backed by secure Supabase queries:
  - Forms count: `core_forms` filtered by `event_id = selectedEventId`.
  - Applications count: `base_application` filtered by `event_id = selectedEventId`.
  - Registration types count: `base_registration_type` filtered by `event_id = selectedEventId`.
- Result shape: integer count or null on error.

### 7.2 Write contracts

**Event update** (triggered by save action on `/configuration`)
- Target: BA01 mutation hook/service backed by `useSecureSupabase().from('core_events').update(payload).eq('event_id', eventId).select('event_name, event_code, event_email, event_date, event_days, event_venue, expected_participants, typical_unit_size, registration_scope, event_colours, is_visible, description, updated_at, updated_by')`.
- Allowed update columns (the editable scope owned by this slice): `event_name, event_code, event_email, event_date, event_days, event_venue, expected_participants, typical_unit_size, registration_scope, event_colours, is_visible, description, updated_at, updated_by`.
- **Disallowed columns** (must not be in the update payload at all): `event_id, organisation_id, public_readable, event_billing, event_catering_email, event_news, event_rounddown, event_youthmultiplier, participant_blurb, participant_admin_email, participant_website_url, created_at, created_by`.
- Success outcome: a single updated row returned with the select columns listed above. Form values stay populated with the saved data; no re-fetch.
- Failure outcomes:
  - RLS / permission failure → standard Supabase error → friendly error message via formatter.
  - Network failure → standard error → friendly error message.
  - Validation failure → caught client-side before the request is sent.

**Logo file upload** (triggered by `FileUpload` selection)
- The `FileUpload` component handles the upload using the following props:
  - `supabase` (from `useSecureSupabase()`) — required
  - `bucket="files"` — required
  - `table_name="core_events"` — required, snake_case
  - `record_id={eventId}` — required, snake_case (`eventId` from `useUnifiedAuth().selectedEventId`)
  - `organisation_id={organisationId}` — required, snake_case
  - `event_id={eventId}` — required, snake_case
  - `app_id={appId}` — required, snake_case (`appId` from RBAC scope APIs such as `useResolvedScope().appId`)
  - `category="event_logos"` — required, string literal (or `FileCategory.EVENT_LOGOS` if the enum is still exported — verify in §9)
  - `folder="event_logos"` — optional telemetry metadata
  - `pageContext="configuration"` — optional telemetry metadata
  - `is_public={true}` — optional, snake_case
  - `accept="image/*"` — optional
  - `maxSize={5 * 1024 * 1024}` — optional
  - `userId` is not part of the current `FileUploadOptions` contract and must not be passed.
- `onUploadSuccess: (result: FileUploadResult) => void` — call `setLogoRef(result.file_reference)` to update the display.
- `onUploadSuccess: (result: FileUploadResult) => void` — persist `core_events.logo_id = result.file_reference.id` in BA01 service/hook layer, then update local display state from `result.file_reference`.
- `onUploadError: (error: Error) => void` — `error` is an `Error` object. Show destructive toast: `"Failed to upload logo: {error.message}"`.

### 7.3 Permission / RLS contracts

| Action | pageName / operation | Scope |
|--------|---------------------|-------|
| Page read on `/event-dashboard` | `event-dashboard` / `read` | `{ organisationId, eventId, appId }` |
| Page read on `/configuration` | `configuration` / `read` | `{ organisationId, eventId, appId }` |
| Update on `/configuration` (save + logo upload + editable fields) | `configuration` / `update` | `{ organisationId, eventId, appId }` |

`core_events` RLS is owned by the backend layer and is not modified by this slice. The slice assumes the documented RLS posture: a user with `read` on `configuration` can read the event row; a user with `update` on `configuration` can mutate the editable columns.

### 7.4 Cross-slice handoffs

- **Inputs from BA00:**
  - `useEvents().selectedEvent` — event context (`EventStub | null`). Properties used for display: `event_name`, `event_date`, `event_days`, `event_venue` (verify field names against BASE event type at build time — see §7.1 note).
  - `useUnifiedAuth().user` — authenticated user. `user.id` (string) used as `updated_by` in save payload.
  - `useUnifiedAuth().selectedOrganisationId` — current organisation (`string | null`), mapped to `organisationId` in scope objects.
  - `useUnifiedAuth().selectedEventId` — canonical event ID (`string | null`), used as `eventId` in scope objects and as `record_id` for `FileUpload` and in count queries. Prefer this over `selectedEvent?.event_id`.
- **Inputs from RBAC scope APIs:**
  - `useResolvedScope().appId` (or equivalent `useRBAC()` scope value) — canonical resolved app ID for permission scope and file upload `app_id`.
  - `useResolvedScope().organisationId` / `eventId` — preferred source for guard scope composition; auth-selected IDs may be retained as feature-level fallbacks.
- **Outputs to sibling slices:** none (this slice does not export hooks or services consumed by others).
- **Navigation handoffs:** clicking a nav card on `/event-dashboard` hands control to the destination slice's owned route (`/forms`, `/applications`, `/registration-types`, `/reports`, `/communications`).

### 7.5 ID contracts

Where IDs cross hook or service boundaries within this slice, use the typed branded IDs from `@solvera/pace-core/types` (`OrganisationId`, `EventId`, `AppId`, `UserId`) rather than raw `string`. Database queries that take string IDs accept the branded types directly.

## 8. Data and schema references

### 8.1 Tables consumed

| Table | Purpose |
|-------|---------|
| `core_events` | Primary event row. Read for both routes; updated by the configuration save action. |
| `core_file_references` | Read on both routes to load the current event logo (`FileReference`) via `core_events.logo_id`; written indirectly by `FileUpload` on configuration route. |
| `core_forms` | Counted on the dashboard (Forms nav card). |
| `base_application` | Counted on the dashboard (Applications nav card). |
| `base_registration_type` | Counted on the dashboard (Registration Types nav card). |

### 8.2 `core_events` editable column scope

Only the following columns of `core_events` may be written by this slice's save action:

`event_name, event_code, event_email, event_date, event_days, event_venue, expected_participants, typical_unit_size, registration_scope, event_colours, is_visible, description, updated_at, updated_by`.

Out-of-scope `core_events` columns (not surfaced in this slice and not included in any update payload): `event_id, organisation_id, public_readable, event_billing, event_catering_email, event_news, event_rounddown, event_youthmultiplier, participant_blurb, participant_admin_email, participant_website_url, created_at, created_by`.

### 8.3 Verification steps (Supabase MCP, dev-db only)

The build agent should verify before implementation:

1. `core_events` has all the columns listed in §8.2 with expected types (text / int / jsonb / boolean / timestamp).
2. `registration_scope` is NOT NULL text.
3. `core_forms`, `base_application`, `base_registration_type` each have an `event_id` column for filtering.
4. RLS on `core_events` permits the read-and-update flows for users with the relevant permission keys (no schema changes required by this slice).
5. `core_file_references` exists with columns: `id`, `table_name`, `record_id`, `file_path`, `file_metadata` (jsonb), `app_id`, `is_public`, `created_at`, `updated_at`. Confirm RLS allows the scoped read query in §6.13 for users with `read:page.event-dashboard` and `read:page.configuration`. `category`/`folder` are upload options and path/metadata conventions, not top-level DB columns.
6. Confirm the BASE event type shape: verify whether `useEvents().selectedEvent` exposes `event_name`, `event_date`, `event_days`, `event_venue` as direct properties or under a different naming convention.

### 8.4 Domain reference

The bounded context for this slice is § 2 of `BASE-architecture.md` (Event Workspace and Configuration). Higher-level data contract notes for `core_events` are owned by the BASE domain reference within `docs/database/domains/base.md`.

## 9. pace-core2 imports

### 9.1 Required symbols actually used in this slice

| Symbol | Import policy | Why used in BA01 |
|---|---|---|
| `PagePermissionGuard` / `AccessDenied` | Default root import where available; allow scoped `/rbac` exception when required | Route/page gating |
| `useSecureSupabase` | Default root import where available; allow scoped `/rbac` exception when required | Scoped reads/writes |
| `useEvents` / `useUnifiedAuth` | Default root import where available; allow scoped `/hooks` exception when required | Event context and scope values |
| `useZodForm` | Default root import where available; allow scoped `/hooks` exception when required | Form bridge for `/configuration` |
| `DatePickerWithTimezone` | Default root import where available; allow scoped `/components` exception when required | Event date input |
| `AddressField` | Scoped `/forms` exception path (forms-runtime module surface) | Venue address entry |
| `FileUpload` / `FileDisplay` | Default root import where available; allow scoped `/components` exception when required | Event logo handling |

### 9.2 Slice-specific caveats only

- `AddressField` is controller-managed; pass `meta/control/name` directly.
- Save payload normalises date values to midnight UTC.
- Update controls are guarded by `PagePermissionGuard` update checks.
- Event selection remains shell-owned via `useEvents()`.
- Import style in this slice follows root-first policy; scoped `/forms` (and any `/rbac` `/hooks` `/components`) usage is exception-only.

## 10. Permission and access rules

| Surface / action | pageName / operation | Scope | Result if denied |
|------------------|---------------------|-------|------------------|
| Render `/event-dashboard` | `event-dashboard` / `read` | `{ organisationId, eventId, appId }` | Page renders `<AccessDenied />`. |
| Render `/configuration` | `configuration` / `read` | `{ organisationId, eventId, appId }` | Page renders `<AccessDenied />`. |
| Render configuration form fields in editable state | `configuration` / `update` | `{ organisationId, eventId, appId }` | `PagePermissionGuard` `fallback` renders all form fields with `disabled={true}`; save button absent. |
| Render "Save" button | `configuration` / `update` | as above | Button hidden (`fallback={null}`). |
| Render logo `FileUpload` control | `configuration` / `update` | as above | Upload control hidden (`fallback={null}`). |
| Render logo `FileDisplay` | `configuration` / `read` | as above | n/a (page denied at read level). With read but not update, `FileDisplay` renders. |

The slice does not introduce new RLS policies on `core_events` or any other table.

## 11. Acceptance criteria

Each criterion traces to one or more Functional Specification items. Do not pre-tick boxes — these are verified post-build.

- [ ] Given a permitted user with an event selected, when they navigate to `/event-dashboard`, then the event identity card renders with name, formatted start date, end date (if computed), venue, and logo. (D-PE-01, D-PC-01–D-PC-06, §6.1, §6.5)
- [ ] Given a permitted user with no event selected, when they navigate to `/event-dashboard`, then the event identity card and nav grid do not render and a single message reads "Select an event from the header to begin." (D-ES-01)
- [ ] Given a permitted user with an event selected, when the dashboard renders, then exactly five nav cards appear: Forms, Applications, Registration Types, Reports, Communications. (D-PC-07)
- [ ] Given a permitted user with an event selected, when the dashboard's count fetches succeed, then each of Forms / Applications / Registration Types shows a numeric count; Reports and Communications show no count. (D-PC-07, D-PC-08)
- [ ] Given a permitted user, when a count fetch fails for any nav card, then that card's count slot shows `—` and the rest of the dashboard remains usable. (D-ER-01)
- [ ] Given a non-permitted user (`read:page.event-dashboard` denied), when they navigate to `/event-dashboard`, then `<AccessDenied />` replaces the page content. (D-PR-01)
- [ ] Given a permitted user with `read:page.configuration`, when they navigate to `/configuration`, then the form loads showing the event's current values. (C-PE-01, C-PC-02–C-PC-12)
- [ ] Given a user with `read:page.configuration` but not `update:page.configuration`, when the form renders, then all fields are disabled, the "Save" button is hidden, and the logo upload control is hidden; the logo display remains visible. (C-PR-02, C-PR-03, §10)
- [ ] Given a user with `read` and `update` permissions, when they edit fields and click "Save" with valid input, then a success toast "Event saved successfully!" appears and the database row is updated with the submitted values; the form does not reload from the database. (C-PA-02, C-PA-03, §6.9)
- [ ] Given a user with both permissions, when they click "Save" with `event_name` empty, then a "Validation Error" toast appears, an inline error appears beneath the Event Name field, and no database write occurs. (C-PA-02, §6.6)
- [ ] Given a user with both permissions, when they click "Save" without selecting a Registration Scope, then a validation error appears beneath the Select and submission aborts. (§6.6, §6.7)
- [ ] Given a user with both permissions, when they enter invalid JSON in the Event Colours field and save, then a destructive toast "Invalid JSON in Event Colours field: …" appears and submission aborts. (§6.8)
- [ ] Given a user with both permissions, when they upload a valid image under 5MB via the logo control, then a success toast appears and the displayed logo updates to the new image. (C-PA-05, §6.4)
- [ ] Given a user with both permissions, when they attempt to upload a file over 5MB or a non-image MIME type, then the upload is rejected before any mutation and a destructive toast "Failed to upload logo: …" appears; the previously-displayed logo is unchanged. (§6.4)
- [ ] Given a user without `read:page.configuration`, when they navigate to `/configuration`, then `<AccessDenied />` replaces the page content. (C-PR-01)
- [ ] Given a permitted user with no event selected, when they navigate to `/configuration`, then the form does not render and a single message reads "No event selected. Choose an event from the header to begin." (C-NC-01)
- [ ] Given the configuration page is loading, when the user lands on `/configuration` with an event selected, then a centred `LoadingSpinner` and the caption "Loading event data…" render until the event row arrives. (C-LS-01)

## 12. Verification

- Verify dashboard with selected and no-event context states.
- Verify nav-card counts and count-error fallback behaviour.
- Verify `/configuration` read-only vs editable modes by permission.
- Verify save validations and allowed `core_events` field persistence.
- Verify date/address/logo specific contracts with MCP spot checks.

## 13. Testing requirements

- Dashboard tests: render states, count errors, and page deny state.
- Configuration tests: load, valid save payload, and excluded-column guarantees.
- Validation tests: required fields, bounds, and invalid JSON.
- Permission tests: read deny and update deny behaviour.

## 14. Build execution rules

- Scope is strictly `/event-dashboard` and `/configuration`.
- No schema/RPC/RLS changes in this slice.
- Stop on missing required columns/exports.
- Do not repair sibling routes from this slice.

## 15. Done criteria

- §4 behaviours are demonstrable for dashboard and configuration surfaces.
- §12 verification scenarios are completed with evidence.
- §13 automated coverage passes for critical guard/validation/save paths.

## 16. Do not

- Do not implement event lifecycle provisioning actions here.
- Do not implement page-local event selection.
- Do not place Supabase data-fetch/mutation logic directly in `/pages/*` or `/components/*` route/view files; use BA01 hooks/services.
- Do not write excluded/deprecated `core_events` columns.
- Do not replace required pace-core form controls with local alternatives.
- Do not directly import `react-hook-form` or `zod` in consuming-app BA01 implementation code; use pace-core form patterns (`Form`, `useZodForm`) and BA01 form modules.
- Do not use retired `useCan` for this route gating.

## 17. References

- `docs/requirements/BASE-project-brief.md`
- `docs/requirements/BASE-architecture.md`
- `docs/requirements/BA00-app-shell-and-access-requirements.md`
- `docs/requirements/BA18-base-dev-seed-data-requirements.md`

## 18. Implementing Agent Instructions

- Implement only BA01-owned routes and BA01 feature modules/hooks/services.
- Keep route/page components orchestration-focused; place data access and mutation logic in BA01 hooks/services outside page/component files.
- Stop on contract drift rather than adding stubs/workarounds.
