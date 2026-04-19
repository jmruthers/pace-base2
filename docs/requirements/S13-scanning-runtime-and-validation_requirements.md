## Overview

This slice owns `/scanning/:scanPointId` as the dedicated live operator scanning surface. It covers fast-path card scanning, manual scan capture without a card read, immediate validation outcomes, and the operator experience needed to make scan decisions without ambiguity.

## Current legacy baseline

The legacy app has no documented participant-scanning runtime UI. There is no authoritative legacy runtime or validation contract to preserve, so the rebuild must follow the approved scanning architecture and backend rules instead of copied behaviour.

## Rebuild target

Provide a scan-point-specific runtime that lets an authorised operator:

- identify or confirm the active scan point at all times
- scan a member card and receive an immediate validation result
- perform a manual scan without a card read when operationally required
- see whether the scan is accepted or rejected with one of the approved runtime reason codes
- distinguish card, registration, booking, transport-assignment, and duplicate failure classes where the scan context requires them
- keep scan decisions visible and auditable without making scan events editable

This route is the handheld or on-ground runtime. It must stay visually simpler and faster than `/scanning`.

## pace-core2 delta

`pace-core2` provides auth, permissions, secure Supabase access, and generic UI building blocks. This slice adds the live scanning workflow, scan-result presentation, and validation-state handling that are specific to BASE scanning and must not be inferred from legacy code.

## pace-core2 imports

- `@solvera/pace-core/components`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/providers`
- `@solvera/pace-core/rbac`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`
- `@solvera/pace-core/resilience`

## Data and schema references

- `core_member_card`: card identity and active status used during validation
- `base_scan_point`: current scan-point context, direction, and resource binding
- `base_scan_event`: immutable scan-outcome record with `scan_point_id`, `scan_card_id`, `scanned_at`, `synced_at`, `override_by`, and `notes`
- `base_application`: registration-state input for validation when the scan context depends on application state
- `base_activity_booking`: booking-state input for validation when the scan context depends on participant booking state
- `trac_itinerary_assignment`: transport-assignment input when the scan context depends on boarding state

Approved scanning authority for this slice:

- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy archive — DEC-066)
- [`../../../database/domains/base.md`](../../../database/domains/base.md) (live schema — authoritative)

Approved rebuild deltas that require upstream `pace-core2` follow-up:

- transport offline manifests are included in BASE MVP
- persisted scan outcome must be split into `validation_result` and `validation_reason`

Context-specific validation contract:

- `site`: valid for approved event participants and valid for online-scanned non-participant staff/coordinators without a linked application
- `activity`: valid only for participants with a confirmed booking for the linked session
- `transport`: valid only for participants with a confirmed assignment for the linked transport leg
- `meal`: valid for approved event participants
- non-participant site access is online-only and must not be represented in offline manifests

Required schema direction for scan-result persistence:

- the current dev-db `base_scan_event.validation_result` field is too coarse for the approved runtime contract
- replace the current single-field outcome model with:
  - `validation_result`: persisted outcome class
  - `validation_reason`: persisted rejection/conflict reason
- the rebuild should not bury structured scan reason data inside free-text `notes` when it is part of the core operational contract

Approved live runtime vocabulary for this slice:

- `accepted`
- `rejected_card_not_recognised`
- `rejected_card_not_valid`
- `rejected_registration_not_valid`
- `rejected_booking_not_valid`
- `rejected_duplicate_scan`

Transport runtime mapping:

- transport-assignment failure is surfaced through the same approved operator-facing booking/assignment failure class contract rather than inventing a separate transport-only runtime error label

Override and manual-scan contract for this slice:

- `rejected_card_not_recognised`: not overridable because the scanned credential does not resolve to a known PACE identity
- `rejected_card_not_valid`: overridable
- `rejected_registration_not_valid`: overridable
- `rejected_booking_not_valid`: overridable
- `rejected_duplicate_scan`: not overridable
- manual scan without a card read is allowed in MVP and records an explicit operator-authorised presence event using `override_by` plus optional notes

Approved persistence model for this slice and `S14`:

- runtime/UI vocabulary may stay operator-friendly
- persisted scan outcome and persisted scan reason must be queryable separately
- recommended persisted fields:
  - `validation_result`: `accepted`, `accepted_override`, `rejected`, `upload_conflict`
  - `validation_reason`: `card_not_recognised`, `card_not_valid`, `registration_not_valid`, `booking_not_valid`, `duplicate_scan`, or `null`
- `override_by` continues to indicate who approved an override-backed or manual accepted outcome
- pending upload remains client-local queue state and must not be encoded as a persisted validation result

## Acceptance criteria

- `/scanning/:scanPointId` resolves the active scan point and loads its runtime state.
- A valid card scan produces an immediate, clearly rendered success outcome.
- A manual scan without a card read can be recorded through an explicit operator flow.
- An invalid scan produces a clear rejection that identifies the relevant failure class.
- The UI preserves the approved runtime validation vocabulary instead of flattening all failures into one generic error.
- Override is available only for `rejected_card_not_valid`, `rejected_registration_not_valid`, and `rejected_booking_not_valid`.
- Override is not available for `rejected_card_not_recognised` or `rejected_duplicate_scan`.
- The page handles repeated scans and back-to-back scan attempts without losing the active scan-point context.
- Unauthorised users cannot access the live scan surface.

## API / Contract

- Live card-scan submission contract for a single scan point
- Validation-result contract that returns one approved runtime reason code and an explicit override permission decision
- Manual scan submission contract for operator-selected participants
- Event, booking, and transport-assignment lookup contract used to decide whether a scan is valid
- Override submission contract that records an immutable override-backed accepted outcome using the persisted outcome/reason model plus existing scan-event fields
- Permission contract for accessing live scanning at a scan point

## Visual specification

Use a dedicated operator surface optimised for speed, not a generic desktop admin layout. The runtime should be usable with one hand on a tablet or handheld device and clear from a standing position.

- dominant scan input
- immediate result panel
- high-contrast success and failure states
- minimal chrome and no unnecessary navigation noise
- explicit scan-point identity and event context in view at all times
- a secondary, clearly separated manual-scan path that does not interfere with fast card scanning

## Verification

- Scan a valid card at the correct scan point and confirm the accepted outcome appears immediately.
- Perform a manual scan and confirm the accepted outcome is recorded with operator attribution.
- Scan an unknown credential and confirm `rejected_card_not_recognised` appears with no override path.
- Scan a known but invalid/inactive card and confirm `rejected_card_not_valid` appears with an override path.
- Scan a card that fails registration or booking/assignment validation and confirm the failure class is explicit.
- Scan a duplicate and confirm `rejected_duplicate_scan` appears with no override path.
- Override an allowed rejection and confirm the override is recorded without mutating the original scan history.
- Attempt access with an unauthorised role and confirm the access-denied state.

## Testing requirements

- Happy path: valid card scan at a valid scan point returns the accepted outcome
- Happy path: manual scan creates an operator-attributed accepted outcome
- Validation failure: unknown card, invalid card, registration failure, booking/assignment failure, or duplicate scan returns the correct rejection state
- Auth/permission failure: block a user without live-scanning permission
- Add coverage for override availability on allowed rejection classes and no-override behaviour on non-overridable classes

## Open questions

None currently.

## Do not

- Do not copy legacy scanning UI or legacy client-side validation assumptions.
- Do not collapse distinct validation failures into one generic error.
- Do not make scan events editable.
- Do not allow override when the scanned credential does not resolve to a known PACE identity.
- Do not allow override for duplicate scans.
- Do not treat manual scan as silent record injection; it must remain an explicit operator action.
- Do not force this workflow into `PaceAppLayout` if the operator surface needs dedicated chrome.
- Do not introduce sync or reconciliation behaviour in this slice.

## References

- [`../architecture.md`](../architecture.md)
- [`../project-brief.md`](../project-brief.md)
- the implementation plan in [`../architecture.md`](../architecture.md)
- the pace-core2 compliance rules in [`../architecture.md`](../architecture.md)
- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy decision archive)
- [`../../../database/domains/base.md`](../../../database/domains/base.md)
