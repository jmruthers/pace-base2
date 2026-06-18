# BA14 — Scanning Sync and Reconciliation

## Slice metadata

- Status: Draft
- Depends on: BA13 (IndexedDB queue producer), BA12 (scan-point admin and conflict display consumer)
- Backend impact: Schema confirmed deployed — `base_scan_event` two-column split (`validation_result`, `validation_reason`) live in dev-db `rkytnffgmwnnmewevqgp`. `core_member_card` live. `base_scan_point` live. No migration needed for BA14 itself. RLS on `base_scan_event` (authenticated INSERT denied; service_role INSERT allowed) must be deployed before the flush path can be tested end-to-end.
- Frontend impact: Background sync worker (no standalone route). Queue state display embedded in BA12 surfaces.

---

## 2. Overview

BA14 is a background sync worker with no standalone route. It reads `pending` and `failed` entries from the `ba13_scan_queue` IndexedDB database — written by BA13's scanning runtime — and flushes each entry independently to `base_scan_event` via the **`base-scan-sync` Edge Function** (which executes all writes using the service_role Supabase key server-side). The service_role key must never be exposed in browser code; the Edge Function is the sole service_role execution boundary. Because `ba13_scan_queue` entries do not carry `event_id`, `organisation_id`, `scan_card_id`, or `member_id`, the Edge Function resolves these before each INSERT: it looks up `core_member_card` by `card_identifier` (for `scan_card_id` and `member_id`) and looks up `base_scan_point` by `scan_point_id` (for `event_id` and `organisation_id`). All four fields are NOT NULL on `base_scan_event`. After a successful INSERT, the Edge Function queries `base_scan_event` to detect whether another device uploaded a scan for the same card at the same scan point; where a conflict is found, it marks the later-uploaded entry with `validation_result = 'upload_conflict'` via service_role UPDATE. The earlier entry is not modified.

The sync worker transitions each queue entry through the `sync_status` state machine (`pending → syncing → synced / failed`). Queue state display — badges and the conflict review section — is embedded in BA12's `/scanning` surface. BA14 defines the badge vocabulary and the conflict data contract; BA12 renders them.

---

## 3. What this slice delivers

### Purpose

Scan events are written to a client-local IndexedDB queue during the scanning runtime (BA13), regardless of network state. BA14 is responsible for flushing those queued events to `base_scan_event` when connectivity is available, ensuring idempotent delivery, detecting upload conflicts that arise when two devices scan the same card at the same scan point, and surfacing queue health state through a standardised badge vocabulary consumed by BA12.

### Surfaces

- **Background sync worker** — not a route. The worker attaches to the browser `online` event and runs on a 30-second polling interval. It has no standalone page, modal, or panel.
- **Queue state badges** — defined by BA14, rendered by BA12 and BA13 host surfaces.
- **Conflict data contract** (`BA14.conflict.contract`) — BA14 writes `upload_conflict` rows to `base_scan_event`; BA12 reads them as a display-only consumer.

### What this slice does not deliver

1. Scan-point admin (`/scanning`) — BA12.
2. Scanning runtime (`/scanning/:scanPointId`) — BA13.
3. Tracking dashboard (`/scanning/tracking`) — BA16.
4. Card issue, deactivation, or replacement workflows — TEAM-owned.
5. Server-side queue table — explicitly excluded from MVP.
6. Service Worker push-based sync — excluded from MVP. The sync trigger is the browser `online` event plus 30-second polling.

### Architectural posture

1. All writes to `base_scan_event` (INSERT and conflict UPDATE), the `core_member_card` lookup, and the `base_scan_point` lookup at flush time are executed by the **`base-scan-sync` Edge Function** using the service_role Supabase key. The browser client calls this Edge Function — it does not hold the service_role key itself. The service_role key must not be exposed to route-level or browser-context code under any circumstances.
2. The browser-side sync worker sends each flush payload to `base-scan-sync` via a standard `fetch()` call (with the user's auth JWT in the `Authorization` header so the Edge Function can identify the caller for logging). The Edge Function performs: card lookup (`core_member_card`), scan-point lookup (`base_scan_point`), INSERT to `base_scan_event`, and conflict detection + UPDATE — all using the service_role client.
3. The authenticated client (`useSecureSupabase()`) is used only for the `useCan('update:page.scanning')` check that guards the explicit retry UI — not for any INSERT, UPDATE, or conflict-detection query.
3. The sync worker initialises on app load (or scan-point-page load) by attaching a `window.addEventListener('online', ...)` listener and starting a 30-second `setInterval` polling loop. The interval is cleared on component or app unmount.
4. The worker reads the `ba13_scan_queue` IndexedDB database (version 1, `scan_events` object store) by opening a full-store cursor on the `scan_events` object store, filtering entries in JavaScript where `sync_status === 'pending' || sync_status === 'failed'`. The `by_scan_point` compound index is not used for the full-flush path (see §7.2).
5. All reads from `ba13_scan_queue` and all `sync_status` writes back to queue entries are performed using the browser's native IndexedDB API directly — no library abstraction.
6. Each queue entry is flushed independently (per-entry flush). A failure on one entry does not block the processing of other entries in the same flush cycle.

---

## 4. Functional specification

Prefix legend: **`SY`** sync worker, **`CF`** conflict flow, **`QD`** queue display.

### Worker initialisation

1. **SY-IN-01 —** On app load (or when the scan-point page mounts), the sync worker attaches a `window.addEventListener('online', handleOnline)` listener. `handleOnline` immediately initiates a full flush of all `pending` and `failed` entries. The listener is removed on component or app unmount via `window.removeEventListener('online', handleOnline)`.
2. **SY-IN-02 —** Concurrently with SY-IN-01, the worker starts a `setInterval(handlePollTick, 30000)`. On each tick, `handlePollTick` initiates a full flush of all `pending` and `failed` entries. The interval ID is stored in a module-level or ref variable and cleared via `clearInterval` on component or app unmount.
3. **SY-IN-03 —** Before attaching the online listener or starting the polling interval, the worker opens the `ba13_scan_queue` IDB database and resets all entries whose `sync_status = 'syncing'` to `sync_status = 'pending'`. This recovers entries that were interrupted mid-flush by an app crash, tab closure, or device power loss. The reset must complete before the first flush cycle begins.

### Sync triggers

3. **SY-TR-01 —** When the browser `online` event fires, the worker immediately flushes all queue entries with `sync_status = 'pending'` or `sync_status = 'failed'`, processing each independently per the per-entry flush sequence (SY-FL-01 through SY-FL-07).
4. **SY-TR-02 —** On each 30-second poll tick, the worker flushes all queue entries with `sync_status = 'pending'` or `sync_status = 'failed'`, processing each independently. The poll runs whether or not the device believes it is online — the INSERT attempt itself determines connectivity.

### Per-entry flush sequence

5. **SY-FL-01 —** For each queue entry selected for flushing, the worker reads the entry from the `scan_events` object store by `local_id` and checks its current `sync_status`. If `sync_status` is not `pending` or `failed`, the entry is skipped without modification (guard against concurrent flush cycles).
6. **SY-FL-02 —** The worker updates the entry's `sync_status` to `syncing` via `IDBObjectStore.put()` before any network operation. This prevents a second concurrent flush cycle from picking up the same entry.
7. **SY-FL-03 —** If `entry.card_identifier` is null (a manual scan entry from BA13's manual scan flow where no physical card was presented), the INSERT cannot proceed because `base_scan_event.scan_card_id` is NOT NULL and has no alternative resolution path in MVP. The entry is marked `sync_status = 'failed'` with `failure_reason = 'manual_scan_no_card'` (a local-only label) and a warning is logged (see SY-RP-03). No retry will succeed until a card-resolution path for manual scans is added. This is a known MVP limitation documented in §16 item 13. The worker proceeds to the next entry without blocking the flush cycle.
8. **SY-FL-04 —** The worker queries `core_member_card` via the service_role client: `from('core_member_card').select('id, member_id').eq('card_identifier', entry.card_identifier).maybeSingle()`. The `maybeSingle()` method (not `.single()`) is used so that a zero-row result returns `null` without throwing, and a multi-row result returns an error rather than silently picking one row. If the result is `null` (no matching card), the entry is marked `failed` per SY-RP-01. If the query errors (including a multi-row error from `maybeSingle()`), the entry is marked `failed` per SY-RP-02. The `event_id` and `organisation_id` required for the INSERT are fetched in this same step: after the card lookup, the worker fetches the `base_scan_point` row by `entry.scan_point_id` (service_role client, `select('event_id, organisation_id')`) to resolve these two NOT NULL fields. If the scan_point fetch fails, the entry is marked `failed`.
9. **SY-FL-05 —** If both lookups in SY-FL-04 succeed, the worker constructs the INSERT payload (per §7.1) and issues a service_role INSERT to `base_scan_event` with `id = entry.local_id`. If the INSERT returns a unique-violation error on `id` (primary-key conflict, Postgres error code `23505`), the entry is treated as already uploaded and transitions to `synced` per SY-ID-01 — no retry is scheduled.
10. **SY-FL-06 —** If the INSERT succeeds (or is treated as an idempotent duplicate per SY-ID-01), the worker runs the conflict check (CF-DT-01). If a conflict is detected, the conflict persistence path (CF-UP-01) executes before the entry is marked `synced`.
11. **SY-FL-07 —** If the INSERT fails for any reason other than a primary-key conflict (network error, RLS violation, server error, or any other database error), the worker marks the entry `sync_status = 'failed'` via `IDBObjectStore.put()`. The entry will be retried on the next `online` event or poll tick per SY-TR-01 and SY-TR-02.

### Idempotency

12. **SY-ID-01 —** `entry.local_id` is sent as the `id` field on every INSERT. If the database returns a unique-violation error on the `id` column (Postgres error code `23505`), the entry was previously uploaded successfully. The worker treats this as success: it marks the entry `sync_status = 'synced'` without retrying the INSERT and without attempting a conflict check.

### Card lookup failure handling

13. **SY-RP-01 —** When the `core_member_card` query via `maybeSingle()` returns `null` (no row matches `entry.card_identifier`), the entry is marked `sync_status = 'failed'`. No INSERT is attempted. The worker logs a warning: `[BA14] core_member_card lookup returned no row for card_identifier {entry.card_identifier} (local_id {entry.local_id}) — card may have been removed or deactivated after scan.` The entry will be retried on the next sync cycle and will continue to fail until the card is registered or the entry is cleared.
14. **SY-RP-02 —** When the `core_member_card` query errors — including network errors and the multi-row `maybeSingle()` error (two or more rows share the same `card_identifier`) — the entry is marked `sync_status = 'failed'` and the error is logged. For the multi-row case, the log must include: `[BA14] core_member_card lookup returned multiple rows for card_identifier {entry.card_identifier} (local_id {entry.local_id}) — data integrity issue; cannot determine correct card UUID.` The entry is retried on the next sync cycle; multi-row entries will continue to fail until the data integrity issue is resolved by a TEAM operator.
15. **SY-RP-03 —** When `entry.card_identifier` is null (manual scan entry per BA13 BR-MS-01), the INSERT is not attempted and the entry is marked `sync_status = 'failed'`. The worker logs a warning: `[BA14] card_identifier is null on local_id {entry.local_id} — manual scan entries cannot be flushed in MVP (see §16 item 13).` No retry will succeed. This is a known MVP limitation: manual scan entries have no card to look up, and `base_scan_event.scan_card_id` is NOT NULL with no fallback resolution path. See §16 item 13.

### Conflict detection

16. **CF-DT-01 —** After a successful INSERT (or after confirming an idempotent duplicate per SY-ID-01), the worker queries `base_scan_event` for a conflicting row using the service_role client:

    ```ts
    from('base_scan_event')
      .select('id, scanned_at')
      .eq('scan_point_id', entry.scan_point_id)
      .eq('scan_card_id', resolved_card_id)   // from the core_member_card lookup
      .in('validation_result', ['accepted', 'accepted_override'])
      .neq('id', entry.local_id)
    ```

17. **CF-DT-02 —** For each row returned by the conflict query, the worker computes the absolute time difference in seconds between the existing row's scan time and the current entry's scan time. Both operands must be in the same unit before subtraction: `existing_row.scanned_at` is a Postgres `timestamptz` returned by Supabase as an ISO 8601 string — parse it with `new Date(existing_row.scanned_at).getTime()` to get ms epoch; `entry.scanned_at` is already a ms-epoch number (per §7.2). Then: `const diffSeconds = Math.abs(new Date(existing_row.scanned_at).getTime() - entry.scanned_at) / 1000`. If `diffSeconds <= 300`, the row is within the conflict dedup window and constitutes an upload conflict. Clock skew between devices is not compensated; the 300-second window is intentionally wide to absorb typical clock drift. If multiple conflicting rows exist within the window, each is evaluated independently; the current entry is flagged as a conflict regardless of how many earlier accepted entries exist.
18. **CF-DT-03 —** If no row within the dedup window is found by CF-DT-01 through CF-DT-02, no conflict action is taken. The entry transitions to `synced` normally.
19. **CF-DT-04 —** If the conflict detection query itself errors (network error or server error), the worker logs a warning: `[BA14] Conflict check failed for local_id {entry.local_id} — conflict may not be detected. Entry marked synced.` The entry is still marked `synced`; the conflict is not flagged. No automatic retry is possible: once an entry is marked `synced` it is excluded from all future flush cycles (SY-FL-01). If the conflict is not detected at this point, it will not be detected automatically. Manual investigation via `base_scan_event` is required to identify and remediate the undetected conflict.

### Conflict persistence

20. **CF-UP-01 —** When a conflict is detected (CF-DT-02), the worker issues a service_role UPDATE on the current entry's `base_scan_event` row: `from('base_scan_event').update({ validation_result: 'upload_conflict' }).eq('id', entry.local_id)`. The earlier row (the row that was returned by the conflict query) is not modified.
21. **CF-UP-02 —** The `validation_reason` field on the current entry's `base_scan_event` row is not modified by the conflict UPDATE. It carries the BA13-decided rejection reason from the queue entry unchanged. `upload_conflict` is written only to `validation_result`; `validation_reason` is never set to `upload_conflict`.

### Conflict data contract

22. **CF-DC-01 —** The conflict data contract identifier is `BA14.conflict.contract`. It is defined as the set of `base_scan_event` rows where `validation_result = 'upload_conflict'`, scoped to the current event and its scan points. BA14 is the sole writer of rows carrying `validation_result = 'upload_conflict'`. BA12 reads these rows as a display-only consumer using the two-step query pattern: (1) fetch `base_scan_point.id` values for `event_id = selectedEvent.id`; (2) query `base_scan_event` with `.in('scan_point_id', scanPointIds).eq('validation_result', 'upload_conflict')`. BA12 does not issue any UPDATE, INSERT, or DELETE against `base_scan_event` conflict rows.

### Queue state badges

23. **QD-BD-01 —** A queue entry with `sync_status = 'pending'` is represented in BA12 surfaces by an amber `Badge` with label "Pending upload".
24. **QD-BD-02 —** A queue entry with `sync_status = 'syncing'` is represented by a `Badge` with label "Uploading…" and a pulse animation applied via `className='animate-pulse'` (Tailwind utility class). The `Badge` component from pace-core2 does not have a built-in animation variant; the Tailwind class is applied as an additional `className` prop alongside the variant. The pulse animation signals an in-progress network operation.
25. **QD-BD-03 —** A queue entry with `sync_status = 'synced'` is represented by a success `Badge` with label "Uploaded".
26. **QD-BD-04 —** A queue entry with `sync_status = 'failed'` is represented by a destructive `Badge` with label "Upload failed".
27. **QD-BD-05 —** A `base_scan_event` row with `validation_result = 'upload_conflict'` is represented in BA12 surfaces by a warning `Badge` with label "Upload conflict". This badge is derived from `base_scan_event.validation_result`, not from `sync_status` (which will be `synced` for the corresponding queue entry).

### Explicit retry

28. **QD-RT-01 —** An explicit user-initiated retry action resets a `failed` queue entry to `sync_status = 'pending'` and immediately initiates a flush for that entry. The retry action is rendered only when the authenticated user has `update:page.scanning` (`useCan('update:page.scanning').can === true`). When the permission is absent, no retry button is rendered. Background sync (automatic on `online` event or poll tick) runs regardless of user permission.

---

---

## Visual specification

- Prototype reference: sync UX not shown separately in `UnitsActivitiesScanPage.jsx` — extend **ScanningPage** / **ScanRuntimePage** list patterns (BA12/BA13) for offline queue indicators and reconciliation status in pass 2.
- **Implementation delta (pass 2):** add sync badge/toast surfaces on scan point list and runtime header; no dedicated route in prototype.

---

## 5. Error states

| State | Trigger | Display | Recovery |
|-------|---------|---------|----------|
| Entry stuck in `syncing` after crash | App crash, tab close, or device power loss while a flush was in progress | Entry remains `syncing`; excluded from flush by SY-FL-01 | SY-IN-03 resets all `syncing` entries to `pending` on worker initialisation. No operator action needed. |
| Card lookup failure | `core_member_card` has no row matching `entry.card_identifier` at flush time | Queue entry marked `failed`; destructive chip "Upload failed" in BA12 surface | Automatic retry on every sync cycle; will continue to fail until card is registered. |
| Card lookup multi-row error | `maybeSingle()` returns an error because two rows share the same `card_identifier` | Queue entry marked `failed`; error logged including data integrity warning | Automatic retry; will continue to fail until TEAM operator resolves the duplicate card record. |
| Manual scan (null `card_identifier`) — MVP limitation | `entry.card_identifier` is null; no card-resolution path exists for `scan_card_id NOT NULL` | Queue entry marked `failed`; warning logged; "Upload failed" chip in BA12 surface | No automatic recovery. Manual scan entries cannot be flushed in MVP (§16 item 13). Retry will always fail. Operator must be informed the manual scan is not recorded in the server. |
| Card lookup network error | Network error on the `core_member_card` SELECT or `base_scan_point` SELECT | Queue entry marked `failed`; error logged | Automatic retry on next `online` event or poll tick |
| INSERT failure (non-PK) | Network error, RLS rejection, or server error on `base_scan_event` INSERT | Queue entry marked `failed`; destructive chip "Upload failed" | Automatic retry on next `online` event or poll tick; no back-off, no max retry count |
| PK conflict on INSERT | INSERT returns unique-violation on `id = entry.local_id` (Postgres `23505`) | Entry treated as `synced` (already uploaded); no badge change | No recovery needed |
| Conflict detection query failure | Network error on the post-INSERT conflict check query | Warning logged; entry marked `synced`; no `upload_conflict` written | No automatic recovery. Once `synced`, the entry is excluded from future cycles. Manual investigation of `base_scan_event` required. |
| Conflict UPDATE failure | Network error or server error on the `validation_result = 'upload_conflict'` UPDATE | Warning logged; entry marked `synced`; conflict may be invisible in BA12 | No automatic recovery. Manual investigation of `base_scan_event` required. |

---

## 6. Business rules

### BR-SS-01 — State machine

A queue entry transitions through the following states. Only BA14 is permitted to write `sync_status` values other than `pending` (BA13 writes `pending` at queue-write time):

- `pending` — set by BA13 at queue-write time. The entry has not yet been picked up by BA14.
- `syncing` — set by BA14 immediately before any network operation for the entry (SY-FL-02). Prevents a second concurrent flush cycle from picking up the same entry. On worker initialisation, all entries in `syncing` are reset to `pending` (SY-IN-03) to recover from app crashes that interrupted a prior flush cycle.
- `synced` — set by BA14 after a successful INSERT to `base_scan_event`, or after confirming that the entry was previously uploaded (PK conflict).
- `failed` — set by BA14 when the card lookup fails, the card identifier is null, or the INSERT fails for any non-idempotent reason.

The `sync_status` field lives on the local queue entry only. It is never written to any column of `base_scan_event`.

### BR-SS-02 — `upload_conflict` never written to queue `sync_status`

`upload_conflict` is a value on `base_scan_event.validation_result` only. It is never written to the local queue's `sync_status` field. A conflicted entry reaches `synced` in the queue; the conflict is recorded only in `base_scan_event` via the CF-UP-01 UPDATE.

### BR-IO-01 — Ingest-only

BA14 does not re-run booking validation, registration checks, transport eligibility, site-access rules, or any other business-logic validation at flush time. The BA13-decided payload — including `validation_result` and `validation_reason` — is flushed to `base_scan_event` exactly as written by BA13, with no modification except the `upload_conflict` UPDATE applied to the later conflicting entry's own row.

### BR-IO-02 — Immutable events

BA14 does not edit `validation_result` or `validation_reason` on existing `base_scan_event` rows except for the single UPDATE that writes `upload_conflict` to the later-uploaded conflicting entry's `validation_result`. The earlier row's `validation_result` and `validation_reason` are never changed. No other `base_scan_event` field is modified by BA14 after the initial INSERT.

### BR-ID-01 — `local_id` is `base_scan_event.id`

The `crypto.randomUUID()` value generated by BA13 at queue-write time is stored as `local_id` on the queue entry and sent as the `id` field in every INSERT to `base_scan_event`. Primary-key uniqueness on `base_scan_event.id` provides end-to-end idempotency: if the same entry is flushed twice (e.g. after a failed network acknowledgement), the second INSERT returns a PK conflict and is treated as a successful duplicate.

### BR-CM-01 — `scan_card_id`, `member_id`, `event_id`, and `organisation_id` resolution

`scan_card_id` (FK to `core_member_card.id`), `member_id` (FK to `core_member.id`), `event_id`, and `organisation_id` are all NOT NULL on `base_scan_event` and cannot be defaulted. None of these four fields are present in the `ba13_scan_queue` entry. BA14 resolves them as follows: (1) `scan_card_id` and `member_id` — query `core_member_card` via `maybeSingle()` where `card_identifier = entry.card_identifier` (service_role client); (2) `event_id` and `organisation_id` — query `base_scan_point` where `id = entry.scan_point_id` (service_role client). If any lookup fails or returns no row, the INSERT is not attempted and the entry is marked `failed`. All four resolved values are included in the INSERT payload per §7.1.

### BR-SD-01 — `synced_at` is upload time

`synced_at` on `base_scan_event` is set by the column's `DEFAULT now()` at INSERT time — the Supabase server clock at the moment of upload. BA14 does not supply a value for `synced_at` in the INSERT payload. `scanned_at` (from the queue entry) reflects the original scan-decision timestamp recorded by BA13 and is passed through unchanged.

### BR-NS-01 — No server-side queue table

The MVP queue is client-local IndexedDB only. No server-side queue table is created, read, or written. BA14 reads from the `ba13_scan_queue` IndexedDB database directly on the client device.

### BR-BP-01 — Background sync requires no user permission

The automatic sync worker (online event listener and 30-second polling loop) runs regardless of which user is on screen and requires no user permission check. Only the explicit user-initiated retry button requires `update:page.scanning`, and that check applies only to rendering the retry UI — not to the background flush logic itself.

---

## 7. Data contracts

### 7.1 — `base_scan_event` INSERT payload

The following fields are supplied by the `base-scan-sync` Edge Function on every INSERT. The browser-side sync worker constructs the flush payload (from the queue entry plus the resolved card and scan-point lookups) and posts it to the Edge Function; the Edge Function performs the actual INSERT using the service_role client. Fields marked "server default" are not included in the INSERT payload — the database supplies them.

| Field | Source | Notes |
|-------|--------|-------|
| `id` | `entry.local_id` (UUID from queue) | PK; idempotency key |
| `event_id` | `base_scan_point.event_id` (fetched in SY-FL-04 by `entry.scan_point_id`) | NOT NULL; derived from the scan_point row — not from the queue entry |
| `organisation_id` | `base_scan_point.organisation_id` (fetched in SY-FL-04 by `entry.scan_point_id`) | NOT NULL; derived from the scan_point row — not from the queue entry |
| `scan_point_id` | `entry.scan_point_id` | UUID from queue entry |
| `scan_card_id` | `core_member_card.id` (live lookup by `card_identifier` in SY-FL-04) | NOT NULL; resolved by BA14 before INSERT |
| `member_id` | `core_member_card.member_id` (from same live lookup in SY-FL-04) | NOT NULL; resolved by BA14 before INSERT |
| `application_id` | Not supplied | Nullable on `base_scan_event`; BA13 does not write `application_id` to the queue in MVP. Field is omitted from the INSERT payload and takes its database default (null). |
| `validation_result` | `entry.validation_result` | BA13-decided outcome enum value; BA14 does not modify this on INSERT |
| `validation_reason` | `entry.validation_reason` | Nullable; passed through from queue unchanged |
| `scanned_at` | `entry.scanned_at` (ms-epoch number per §7.2) | Converted to ISO 8601 timestamptz using `new Date(entry.scanned_at).toISOString()` before INSERT |
| `synced_at` | Server `DEFAULT now()` | BA14 does not supply this value; the database clock at INSERT time is used |
| `device_id` | `entry.device_id` | Nullable; passed through from queue |
| `override_by` | `entry.override_by` | Nullable; passed through from queue |
| `notes` | `entry.notes` | Nullable; passed through from queue |
| `created_by` | Not supplied | Intentionally null. Operator attribution for override and manual scan entries is captured in `override_by` (passed through from queue). Standard accepted/rejected scans do not carry operator identity — `device_id` provides device-level attribution. |

### 7.2 — `ba13_scan_queue` read contract (IndexedDB)

BA14 reads from the following IndexedDB structure, which is owned and created by BA13:

- **DB name:** `ba13_scan_queue`
- **Version:** 1
- **Object store:** `scan_events` (keyPath: `local_id`)
- **Index used by BA14:** For full-flush cycles (SY-TR-01 and SY-TR-02), BA14 opens a full-store cursor on the `scan_events` object store and filters entries in JavaScript where `sync_status === 'pending' || sync_status === 'failed'`. The `by_scan_point` compound index (`[scan_point_id, sync_status]`) is not used by the full-flush path (it requires a specific `scan_point_id` to be efficient). The `by_scan_point` index is available for per-scan-point lookups within BA13 but is not the primary cursor strategy for BA14's flush cycle.
- **`sync_status` writes:** BA14 updates `sync_status` on each queue entry in place via `IDBObjectStore.put()`. The full entry object is written back with the modified `sync_status` field.
- **No deletes:** BA14 never deletes queue entries. Entries accumulate in IndexedDB as a client-local audit trail. A housekeeping mechanism to clear old entries is out of scope for MVP.
- **Queue entry field shape (as written by BA13 and read by BA14):**

| Field | Type | Description |
|-------|------|-------------|
| `local_id` | string (UUID) | Client-generated UUID; used as `base_scan_event.id` on INSERT |
| `scan_point_id` | string (UUID) | Identifies the `base_scan_point`; BA14 uses this to look up `event_id` and `organisation_id` from the scan_point row |
| `card_identifier` | string or null | Decoded card identifier from HID scanner; null for manual scan entries (these cannot be flushed in MVP — see SY-RP-03 and §16 item 13) |
| `scanned_at` | number | `Date.now()` at scan capture time (ms-epoch integer); converted to ISO 8601 timestamptz using `new Date(entry.scanned_at).toISOString()` before INSERT |
| `validation_result` | string | One of: `accepted`, `rejected`, `accepted_override` |
| `validation_reason` | string or null | Rejection reason enum string or null |
| `override_by` | string or null | `auth.uid()` for override/manual scan entries; null for standard scans |
| `notes` | string or null | Operator notes; null if not entered |
| `device_id` | string or null | Session-scoped UUID from `sessionStorage` |
| `sync_status` | string | One of: `pending`, `syncing`, `synced`, `failed` |

Note: `event_id`, `organisation_id`, and `application_id` are NOT present in the queue entry. `event_id` and `organisation_id` are resolved by BA14 via a `base_scan_point` lookup (SY-FL-04). `application_id` is not carried by the queue and is omitted from the INSERT payload (nullable — see §7.1).

### 7.3 — Conflict data contract (`BA14.conflict.contract`)

BA12 reads `base_scan_event` rows where `validation_result = 'upload_conflict'` using the two-step query pattern to avoid nested PostgREST filter issues:

**Step 1 — Fetch scan_point IDs for the event:**
```ts
const { data: pointRows } = await supabase
  .from('base_scan_point')
  .select('id')
  .eq('event_id', selectedEvent.id)
  .eq('organisation_id', selectedOrganisation.id);
const scanPointIds = pointRows?.map(r => r.id) ?? [];
if (scanPointIds.length === 0) return [];
```

**Step 2 — Query conflict rows:**
```ts
from('base_scan_event')
  .select('id, scan_point_id, scan_card_id, validation_result, validation_reason, scanned_at, synced_at, notes, override_by')
  .in('scan_point_id', scanPointIds)
  .eq('validation_result', 'upload_conflict')
  .order('scanned_at', { ascending: false })
```

This is a read-only SELECT. BA12 does not write, update, or delete conflict rows. BA14 is the sole actor that writes `validation_result = 'upload_conflict'` to `base_scan_event`. BA12 uses `@tanstack/react-query` with `staleTime: 0` on this query so the conflict list refreshes after each BA14 sync cycle completes.

---

## 8. Key data fields used

| Field | Source | Type | Notes |
|-------|--------|------|-------|
| `id` | Queue `local_id` | uuid NOT NULL | Used as PK on INSERT; idempotency key |
| `event_id` | `base_scan_point.event_id` (live lookup) | uuid NOT NULL | Resolved by BA14 from scan_point row; not in queue entry |
| `organisation_id` | `base_scan_point.organisation_id` (live lookup) | uuid NOT NULL | Resolved by BA14 from scan_point row; not in queue entry |
| `scan_card_id` | `core_member_card.id` (live lookup) | uuid NOT NULL | Resolved by BA14 before INSERT; cannot be defaulted |
| `member_id` | `core_member_card.member_id` (live lookup) | uuid NOT NULL | Resolved by BA14 before INSERT; cannot be defaulted |
| `validation_result` | Queue entry (passed through) or BA14 UPDATE | enum NOT NULL | BA14-set value: `upload_conflict` only; all others from BA13 via queue |
| `validation_reason` | Queue entry | enum nullable | Passed through unchanged; never set to `upload_conflict` |
| `scanned_at` | Queue entry | timestamptz NOT NULL | Original scan-decision timestamp; not modified at flush time |
| `synced_at` | Server `DEFAULT now()` | timestamptz NOT NULL | Upload timestamp; BA14 does not supply this field |
| `device_id` | Queue entry | text nullable | Passed through unchanged |
| `sync_status` | Queue entry (local only) | text | `pending`, `syncing`, `synced`, `failed`; never written to `base_scan_event` |

---

## 9. Permissions and RBAC

| Action | Permission | Client |
|--------|-----------|--------|
| Background INSERT to `base_scan_event` | service_role (bypasses RLS) | `base-scan-sync` Edge Function (service_role client server-side) |
| Background UPDATE `validation_result = 'upload_conflict'` | service_role (bypasses RLS) | `base-scan-sync` Edge Function (service_role client server-side) |
| Lookup `core_member_card` by `card_identifier` at flush time | service_role (bypasses RLS) | `base-scan-sync` Edge Function (service_role client server-side) |
| Conflict detection query (post-INSERT) | service_role (bypasses RLS) | `base-scan-sync` Edge Function (service_role client server-side) |
| Explicit retry action rendering (user-initiated) | `update:page.scanning` | `useCan('update:page.scanning')` via authenticated client |
| Read conflict rows for display (BA12 surface) | `read:page.scanning` | Authenticated client via `useSecureSupabase()` |

No `PagePermissionGuard` is used by BA14 — it has no standalone route. `useCan('update:page.scanning')` is used only for conditional rendering of the explicit retry button in BA12's queue state display. Background sync runs without any user permission evaluation.

---

## 10. Component map

| Component | Source | Use |
|-----------|--------|-----|
| `Badge` | `@solvera/pace-core/components` | Queue state chips: pending / syncing / synced / failed / conflict (QD-BD-01 through QD-BD-05) |
| `Button` | `@solvera/pace-core/components` | Explicit retry action (QD-RT-01) |
| `Alert` | `@solvera/pace-core/components` | Upload failure notices in BA12's queue-aware surfaces |
| `toast` | `@solvera/pace-core/components` | Sync cycle feedback and conflict notification toasts |
| `useCan` | `@solvera/pace-core/rbac` | Permission-conditional rendering of the explicit retry button |
| `useSecureSupabase` | `@solvera/pace-core/rbac` | Authenticated client for conflict read queries (BA12 display surface) |
| `useEvents` | `@solvera/pace-core/hooks` | `selectedEvent.id` scoping for conflict and history queries |
| `normalizeSupabaseError` | `@solvera/pace-core/utils` | Upload error normalisation for toast and Alert messages |
| `collectSourceErrors`, `composeResilientState`, `resolveWithFallback` | `@solvera/pace-core/resilience` | Composing sync state with partial-data fallback across multiple source errors |
| `EventId`, `OrganisationId`, `UserId` | `@solvera/pace-core/types` | Branded ID types at the sync boundary |

---

## 11. State management

1. Sync worker state (whether a flush cycle is in progress and how many entries are pending) is held in module-level variables or React context state — not in `@tanstack/react-query`. The background worker is not a data-fetch hook; it is a side-effect-driven write path.
2. Queue state display data (badge counts by `sync_status`, conflict count) is derived reactively from an IndexedDB read executed after each sync cycle completes. BA12's surfaces re-query the IDB store after each cycle to refresh badge state.
3. BA12's conflict review table uses `@tanstack/react-query` with `staleTime: 0`. This ensures the conflict list re-fetches after each BA14 sync cycle, so newly detected conflicts appear without manual page refresh.
4. The sync worker holds no persistent server-side state. All state between sync cycles is encoded in the queue entry's `sync_status` field in IndexedDB.

---

## 12. Navigation and routing

BA14 has no standalone route and no navigation affordances. Queue state display and the conflict review table are embedded in BA12's `/scanning` surface. All navigation between scanning surfaces is owned by BA12 and BA13.

---

## 13. Toasts and feedback

| Trigger | Toast variant | Message |
|---------|--------------|---------|
| Sync cycle completes with all flushed entries reaching `synced` (X > 0) | success | "X scan events uploaded" — no toast is fired if X = 0 (no entries were flushed in this cycle) |
| One or more entries marked `failed` after a flush cycle | destructive | "Upload failed for X scan events. Retrying when online." |
| Conflict detected and `upload_conflict` written for an entry | warning | "Upload conflict detected — check the conflict log." |
| Explicit retry succeeds (entry reaches `synced`) | success | "Scan event re-uploaded successfully." |
| Explicit retry fails (entry remains `failed`) | destructive | "Retry failed. Check your connection and try again." |

---

## 14. Accessibility

BA14 has no standalone route or WCAG-specific surface of its own. Queue state badges rendered by BA12 surfaces must use appropriate ARIA roles for status content (`role="status"` where the badge conveys live sync state). The explicit retry button must include an `aria-label` that identifies the specific queue entry being retried. No additional accessibility requirements apply to the background sync worker itself.

---

## 15. Build prerequisites

1. **`base_scan_event` two-column schema (`validation_result`, `validation_reason`):** confirmed deployed in dev-db `rkytnffgmwnnmewevqgp`. No migration is needed for BA14 to begin building against the live schema.
2. **`core_member_card` table:** confirmed live in dev-db `rkytnffgmwnnmewevqgp`. The card lookup in SY-FL-03 can be built and tested immediately.
3. **`base_scan_point` table:** confirmed live in dev-db `rkytnffgmwnnmewevqgp`. Scan-point-scoped queue reads (via `by_scan_point` index) can be built immediately.
4. **`ba13_scan_queue` IndexedDB:** client-local; no migration needed. The IndexedDB contract is owned by BA13 and defined in BA13 §6 BR-IQ-01 and §7.3.
5. **`base-scan-sync` Edge Function:** must be deployed to the Supabase project (`rkytnffgmwnnmewevqgp`) before the flush path can be tested end-to-end. The Edge Function holds the service_role key, performs card and scan-point lookups, executes the `base_scan_event` INSERT, and handles conflict detection and UPDATE. **Build execution must stop if the Edge Function is not deployed.** The Edge Function is the required service_role execution boundary — no browser-side service_role client is permitted.
6. **`base_scan_event` authenticated INSERT RLS changed to `false`:** the current live RLS policy on `base_scan_event` permits authenticated INSERTs via `check_user_event_access`. This must be changed to `false` (deny all authenticated inserts) before the flush path is tested end-to-end. Until changed, authenticated clients could bypass the Edge Function and insert directly — which defeats the service_role-only posture. This is a DB migration, not an Edge Function concern. See BA12 §7.1 for the policy specification.
7. **`base_scan_event` conflict UPDATE RLS:** covered by the same service_role ALL policy used by the Edge Function. No separate migration is needed beyond the INSERT RLS prerequisite above.

---

## 16. Do not

1. Do not write `upload_conflict` to the queue's `sync_status` field. `upload_conflict` is a `base_scan_event.validation_result` value only. A conflicted entry reaches `sync_status = 'synced'` in the queue.
2. Do not re-run booking, registration, transport, or site-access validation at flush time. The BA13-decided payload is flushed to `base_scan_event` unchanged.
3. Do not edit `validation_result` or `validation_reason` on existing `base_scan_event` rows except for the single UPDATE that writes `upload_conflict` to the later-uploaded conflicting entry's `validation_result`. The earlier row is never changed.
4. Do not delete queue entries after a successful or failed flush. Entries accumulate in IndexedDB as a client-local audit trail. Queue housekeeping is out of scope for MVP.
5. Do not create or read a server-side queue table. The MVP queue is client-local IndexedDB only.
6. Do not filter `base_scan_event` queries using a nested PostgREST `.eq('scan_point.event_id', ...)` expression. Use the two-step pattern: fetch `base_scan_point.id` values for the event, then `.in('scan_point_id', scanPointIds)`.
7. Do not attempt the `base_scan_event` INSERT if the `core_member_card` lookup by `card_identifier` returns no row. Mark the entry `failed` and log a warning.
8. Do not apply back-off or enforce a maximum retry count. Every `online` event and every 30-second poll tick retries all `failed` entries unconditionally.
9. Do not use a Service Worker for sync triggering in MVP. The sync trigger is the browser `online` event plus 30-second `setInterval` polling only.
10. Do not issue any INSERT, UPDATE, or DELETE against `base_scan_event` from the authenticated client or from any browser-side code. All writes to `base_scan_event` route through the `base-scan-sync` Edge Function which uses the service_role client exclusively. The service_role key must never appear in browser-side code. (Authenticated SELECT reads of conflict rows for BA12's display surface are permitted via the authenticated client — see §9.)
11. Do not gate background sync on the user's `update:page.scanning` permission. Background sync runs regardless of who is on screen. Only the explicit retry UI button is permission-gated.
12. Do not modify `validation_reason` during the conflict UPDATE. The `validation_reason` field carries the original BA13-decided rejection reason and is never overwritten by BA14.
13. Do not attempt to flush manual scan entries (queue entries where `card_identifier` is null) in MVP. `base_scan_event.scan_card_id` is NOT NULL and cannot be resolved without a `card_identifier`. Manual scan entries are permanently unflushable until a card-resolution path for manual scans is added in a future slice iteration. These entries should be marked `failed` with a distinct log message and must not be retried automatically (they will never succeed). Operators must be informed via the "Upload failed" badge that these entries are not recorded on the server.

---

## 17. Acceptance criteria

1. **AC-01 —** A card scanned offline by BA13 and written to `ba13_scan_queue` with `sync_status = 'pending'` is flushed to `base_scan_event` with `id = local_id` when connectivity is restored (browser `online` event fires), and the queue entry's `sync_status` transitions to `synced`.
2. **AC-02 —** Re-uploading an already-uploaded entry (same `local_id`) does not create a duplicate `base_scan_event` row. The queue entry's `sync_status` transitions to `synced` and no INSERT error propagates to the user.
3. **AC-03 —** Two devices scan the same card at the same scan point within the 300-second dedup window. The second-uploaded entry's `base_scan_event` row has `validation_result = 'upload_conflict'` after BA14's flush. The first-uploaded entry's `validation_result` is not modified.
4. **AC-04 —** A queue entry that fails INSERT is retried on the next `online` event and on each subsequent 30-second poll tick. No back-off delay is introduced and no maximum retry count is enforced.
5. **AC-05 —** The explicit retry action button is visible only to users with `update:page.scanning`. Users without the permission see no retry button in BA12's queue state surface. Background sync continues for all entries regardless of which user is on screen.
6. **AC-06 —** The `synced_at` timestamp on a `base_scan_event` row reflects the upload time (server `DEFAULT now()` at INSERT time), not the `scanned_at` timestamp that was recorded by BA13 at scan-decision time. The two values differ for offline scans.
7. **AC-07 —** When `core_member_card` has no row matching a queued entry's `card_identifier` at flush time, the entry is marked `sync_status = 'failed'`, no INSERT is attempted, and a warning is logged. The entry is retried on the next sync cycle.
8. **AC-08 —** BA14 does not write `upload_conflict` to `base_scan_event.validation_reason`. The `validation_reason` column carries the original BA13-decided rejection reason (e.g. `booking_not_valid`) or null, unchanged through the flush path and through the conflict UPDATE.
9. **AC-09 —** Queue state badges in BA12 surfaces accurately reflect the `sync_status` distribution of all queue entries for the selected event after each sync cycle completes. A `synced` entry shows the "Uploaded" badge; a `failed` entry shows the "Upload failed" badge; a `pending` entry shows the "Pending upload" badge.

