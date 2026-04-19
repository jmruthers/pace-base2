## Overview

This slice owns the scanning sync and reconciliation contract. It covers client-local offline queueing, later upload, idempotent sync, and conflict handling for immutable scan events. The slice has no dedicated route in the implementation plan in [`../architecture.md`](../architecture.md), so it must be implemented as embedded support for the scanning workflow rather than as a new route.

## Current legacy baseline

There is no documented legacy participant-scanning sync or reconciliation UI to preserve. The legacy app does not provide an authoritative contract for queueing or conflict resolution, so this slice must follow the rebuild docs and not copied implementation patterns.

## Rebuild target

Provide an offline-safe scanning contract that:

- queues scan attempts on the client when sync is unavailable
- uploads the already-decided scan events when connectivity returns
- records sync status explicitly
- preserves immutable scan events
- surfaces upload conflicts instead of silently overwriting state
- handles retry and duplicate-upload protection without introducing a server-side queue for MVP
- does not re-run business validation during sync

Boundary guardrails for this slice:

- `S14` owns queue state, upload semantics, idempotency, and conflict persistence semantics only.
- `S14` must not grow route ownership, scan-point setup mutations, or manifest-configuration rules; those remain in `S12`.
- `S14` may power queue or conflict UI embedded in scanning surfaces, but it must not absorb `/scanning` admin/ops ownership.

## pace-core2 delta

`pace-core2` provides the auth, secure client, and shared UI primitives. This slice adds the scanning queue state machine, upload flow, idempotent retry handling, and conflict UX, which are not part of the shared core package and must not be invented from legacy behaviour.

## pace-core2 imports

- `@solvera/pace-core/components`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/providers`
- `@solvera/pace-core/rbac`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`
- `@solvera/pace-core/resilience`

## Data and schema references

- `base_scan_event`: immutable scan-event records with `scan_point_id`, `scan_card_id`, `scanned_at`, `synced_at`, `override_by`, and `notes`
- `base_scan_point`: scan-point context required to upload a locally recorded event
- no persistent queue table has been validated for this slice, and MVP must remain client-local queue only

Approved scanning authority for this slice:

- [`../../../database/domains/base.md`](../../../database/domains/base.md) — **live dev-db shape** (includes **FU-029** `base_scan_event` enums + `validation_reason`)
- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) — historical decision text only (not maintained). If legacy § DEC-066 prose conflicts with this slice or `base.md`, **this slice and `base.md` win**.

Approved rebuild deltas that require upstream `pace-core2` follow-up:

- transport offline manifests are included in BASE MVP
- sync remains ingest-only and does not re-run business validation
- persisted scan outcome must be split into `validation_result` and `validation_reason`

Required schema and contract direction for this slice:

- the current dev-db `base_scan_event.validation_result` constraint is too coarse for the approved scanning contract
- replace the current single-field persistence model with:
  - `validation_result`: persisted outcome class
  - `validation_reason`: persisted rejection/conflict reason
- offline queue entries should generate a client-side UUID up front and use that UUID as the final `base_scan_event.id` on upload so retries are idempotent
- `synced_at` should continue to reflect upload time, not scan-decision time
- pending upload remains client-local queue state and must not be encoded as a persisted validation result
- sync does not re-run booking, registration, transport-assignment, or site-access business validation; it uploads the scan event decided at scan time and performs ingest, idempotency, and conflict handling only

Queue and conflict contract for this slice:

- queue states are `pending_upload`, `uploaded`, `upload_failed`, and `upload_conflict`
- transport scan points are offline-capable in the approved BASE rebuild and therefore participate in the same manifest and queue contract as site, activity, and meal scan points
- upload conflicts accept both immutable events into the audit history and flag the later upload explicitly rather than deleting or overwriting either event
- conflict review UI belongs to `/scanning`, but the underlying sync and persistence semantics are owned by this slice

## Acceptance criteria

- Offline scans are queued rather than lost when sync is unavailable.
- Queued scans can be retried and uploaded idempotently when connectivity returns.
- The UI shows whether a queued item is pending upload, uploaded, failed upload, or upload-conflicted.
- Reconciliation does not mutate historical scan events in place.
- Upload conflicts accept both immutable events and flag the conflicting upload explicitly.
- Unauthorised users cannot perform upload or conflict-review actions.

## API / Contract

- Offline queue contract for scan attempts
- Upload and retry contract for queued scan events
- Idempotency contract using client-generated event IDs
- Conflict-handling contract that preserves both immutable events and flags conflict instead of rejecting history
- Immutable scan-event append-only contract

## Visual specification

This slice has no standalone route, but any queue or conflict UI must make operational state obvious at a glance.

- status chips for pending upload, uploaded, upload failed, and upload conflict
- queue list or detail panel in the relevant scanning surfaces
- explicit conflict messaging
- retry actions only where the user has permission

## Verification

- Queue a scan while offline and confirm it stays pending.
- Restore connectivity and confirm the queued scan is uploaded with the original client-generated event ID.
- Retry the same local event and confirm upload is idempotent rather than duplicated.
- Force an upload conflict and confirm both immutable events remain recorded while the later upload is flagged as conflicted.
- Attempt upload/conflict review with an unauthorised role and confirm access is denied.

## Testing requirements

- Happy path: offline queue entry uploads successfully after connectivity returns
- Validation failure: malformed queued payload or invalid upload contract is rejected without mutating historical events
- Auth/permission failure: block a user without upload/conflict-review permission
- Add coverage for idempotent retry using the same client-generated event ID

## Open questions

None currently.

## Do not

- Do not invent a persistent server-side queue table for MVP.
- Do not edit immutable scan events in place.
- Do not re-run business validation during sync.
- Do not hide upload failures or conflicts behind generic toasts or silent retries.
- Do not collapse upload outcomes into one generic status.
- Do not add a new route for this slice unless the implementation plan in [`../architecture.md`](../architecture.md) is updated first.
- Do not add scan-point setup or manifest-configuration behaviour to this slice.

## References

- [`../architecture.md`](../architecture.md)
- [`../project-brief.md`](../project-brief.md)
- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy decision archive)
- [`../../../database/domains/base.md`](../../../database/domains/base.md)
