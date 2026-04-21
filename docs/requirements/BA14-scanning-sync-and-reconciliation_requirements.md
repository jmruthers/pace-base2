# BA14 Scanning Sync And Reconciliation

## Slice metadata

- Status: Planned
- Depends on: BA12, BA13
- Backend impact: Write contract change required
- Frontend impact: Both
- Safe for unattended execution: No
- Ownership notes:
  - Backend: Owns ingest/idempotency/conflict persistence contracts for uploaded scan events.
  - Frontend: Owns client-local queue state, retry behavior, and conflict state presentation.

## Filename convention

Feature requirement slices use numbered BASE prefixes (`BA##`) and a scope slug:

**`BA14-scanning-sync-and-reconciliation_requirements.md`**

## Overview

This slice owns the scanning sync and reconciliation contract. It covers client-local offline queueing, later upload, idempotent sync, and conflict handling for immutable scan events. The slice has no dedicated route in the implementation plan in [`./BA00-base-architecture.md`](./BA00-base-architecture.md), so it must be implemented as embedded support for the scanning workflow rather than as a new route.

## Current baseline behavior

There is no documented legacy participant-scanning sync or reconciliation UI to preserve. The legacy app does not provide an authoritative contract for queueing or conflict resolution, so this slice must follow the rebuild docs and not copied implementation patterns.

## Rebuild delta

### Summary

- What changes: Defines offline queue, retry upload, idempotent sync, and conflict handling semantics.
- What stays: No dedicated route is added; scan setup ownership remains in BA12.

Provide an offline-safe scanning contract that:

- queues scan attempts on the client when sync is unavailable
- uploads the already-decided scan events when connectivity returns
- records sync status explicitly
- preserves immutable scan events
- surfaces upload conflicts instead of silently overwriting state
- handles retry and duplicate-upload protection without introducing a server-side queue for MVP
- does not re-run business validation during sync

Boundary guardrails for this slice:

- `BA14` owns queue state, upload semantics, idempotency, and conflict persistence semantics only.
- `BA14` must not grow route ownership, scan-point setup mutations, or manifest-configuration rules; those remain in `BA12`.
- `BA14` may power queue or conflict UI embedded in scanning surfaces, but it must not absorb `/scanning` admin/ops ownership.

### pace-core2 delta

`pace-core2` provides the auth, secure client, and shared UI primitives. This slice adds the scanning queue state machine, upload flow, idempotent retry handling, and conflict UX, which are not part of the shared core package and must not be invented from legacy behaviour.

### pace-core2 imports

- `@solvera/pace-core/components`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/providers`
- `@solvera/pace-core/rbac`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`
- `@solvera/pace-core/resilience`

### Data and schema references

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
- when an upload conflict is persisted, `validation_result` is `upload_conflict` and `validation_reason` retains the original runtime rejection reason when available

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

## Acceptance traceability

- Offline queue and retry criteria -> Client-local queue + upload/retry implementation -> Pending-to-uploaded transition tests.
- Idempotency and immutability criteria -> Client-generated ID + append-only scan-event contracts -> Duplicate retry/idempotent upload tests.
- Conflict and permission criteria -> Conflict flagging/preservation + RBAC upload actions -> Conflict-state and unauthorized action tests.

## Manual QA pack requirements

- Scenarios: Execute verification flows for offline queueing, connectivity restore upload, idempotent retry, conflict handling, and denied upload/conflict review.
- Expected outcomes: Queue states and conflict semantics remain explicit and preserve immutable history.

## Build execution rules

- Backend schema, RPC, and RLS changes are allowed only when the exact delta is pre-listed in `docs/delivery/backend-delta-backlog.md` and linked from this slice before implementation.
- Stop on blockers: unresolved ingest idempotency behavior, unresolved conflict persistence semantics, or unavailable permission controls for upload actions.

## Done criteria

- Tests pass: Queue state, retry/idempotency, conflict handling, and permission tests pass.
- QA passed: Manual QA evidence for verification scenarios is captured.
- Docs updated: BA14 remains aligned with BA12/BA13 boundaries and live schema authority.

## Do not

- Do not invent a persistent server-side queue table for MVP.
- Do not edit immutable scan events in place.
- Do not re-run business validation during sync.
- Do not hide upload failures or conflicts behind generic toasts or silent retries.
- Do not collapse upload outcomes into one generic status.
- Do not add a new route for this slice unless the implementation plan in [`./BA00-base-architecture.md`](./BA00-base-architecture.md) is updated first.
- Do not add scan-point setup or manifest-configuration behaviour to this slice.

## References

- [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- [`./BA00-base-project-brief.md`](./BA00-base-project-brief.md)
- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy decision archive)
- [`../../../database/domains/base.md`](../../../database/domains/base.md)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (demo app for pace-core, or in-app for consuming apps) as specified in "Testing requirements" and "Verification". Run validate and fix any issues until it passes.

---

**Checklist before running Cursor:** intro doc + guardrails doc + Cursor rules + ESLint config + this requirements doc.
