# BA13 Scanning Runtime And Validation

## Slice metadata

- Status: Planned
- Depends on: BA06, BA11, BA12
- Backend impact: Write contract change required
- Frontend impact: UI
- Safe for unattended execution: No
- Ownership notes:
  - Backend: Owns validation result/reason persistence, override rules, and immutable scan event contracts.
  - Frontend: Owns `/scanning/:scanPointId` runtime UX and immediate operator outcome presentation.

## Filename convention

Feature requirement slices use numbered BASE prefixes (`BA##`) and a scope slug:

**`BA13-scanning-runtime-and-validation_requirements.md`**

## Overview

This slice owns `/scanning/:scanPointId` as the dedicated live operator scanning surface. It covers fast-path card scanning, manual scan capture without a card read, immediate validation outcomes, and the operator experience needed to make scan decisions without ambiguity.

## Current baseline behavior

The legacy app has no documented participant-scanning runtime UI. There is no authoritative legacy runtime or validation contract to preserve, so the rebuild must follow the approved scanning architecture and backend rules instead of copied behaviour.

## Rebuild delta

### Summary

- What changes: Defines live scan runtime with explicit validation vocabulary, override boundaries, and manual scan flow.
- What stays: Runtime remains distinct from admin hub and from sync/reconciliation semantics.

Provide a scan-point-specific runtime that lets an authorised operator:

- identify or confirm the active scan point at all times
- scan a member card and receive an immediate validation result
- perform a manual scan without a card read when operationally required
- see whether the scan is accepted or rejected with one of the approved runtime reason codes
- distinguish card, registration, booking, transport-assignment, and duplicate failure classes where the scan context requires them
- keep scan decisions visible and auditable without making scan events editable

This route is the handheld or on-ground runtime. It must stay visually simpler and faster than `/scanning`.

### pace-core2 delta

`pace-core2` provides auth, permissions, secure Supabase access, and generic UI building blocks. This slice adds the live scanning workflow, scan-result presentation, and validation-state handling that are specific to BASE scanning and must not be inferred from legacy code.

### pace-core2 imports

- `@solvera/pace-core/components`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/providers`
- `@solvera/pace-core/rbac`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`
- `@solvera/pace-core/resilience`

### Data and schema references

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

- transport-assignment failure is surfaced as `rejected_booking_not_valid`; no separate transport-only runtime error label is allowed in MVP

Override and manual-scan contract for this slice:

- `rejected_card_not_recognised`: not overridable because the scanned credential does not resolve to a known PACE identity
- `rejected_card_not_valid`: overridable
- `rejected_registration_not_valid`: overridable
- `rejected_booking_not_valid`: overridable
- `rejected_duplicate_scan`: not overridable
- manual scan without a card read is allowed in MVP and records an explicit operator-authorised presence event using `override_by` plus optional notes

Approved persistence model for this slice and `BA14`:

- runtime/UI vocabulary may stay operator-friendly
- persisted scan outcome and persisted scan reason must be queryable separately
- recommended persisted fields:
  - `validation_result`: `accepted`, `accepted_override`, `rejected`, `upload_conflict`
  - `validation_reason`: `card_not_recognised`, `card_not_valid`, `registration_not_valid`, `booking_not_valid`, `duplicate_scan`, or `null`
- `override_by` continues to indicate who approved an override-backed or manual accepted outcome
- pending upload remains client-local queue state and must not be encoded as a persisted validation result
- runtime-to-persistence mapping required by this slice:
  - `accepted` -> `validation_result=accepted`, `validation_reason=null`
  - `rejected_card_not_recognised` -> `validation_result=rejected`, `validation_reason=card_not_recognised`
  - `rejected_card_not_valid` -> `validation_result=rejected`, `validation_reason=card_not_valid`
  - `rejected_registration_not_valid` -> `validation_result=rejected`, `validation_reason=registration_not_valid`
  - `rejected_booking_not_valid` -> `validation_result=rejected`, `validation_reason=booking_not_valid`
  - `rejected_duplicate_scan` -> `validation_result=rejected`, `validation_reason=duplicate_scan`
  - accepted override or manual accepted scan -> `validation_result=accepted_override`, with original reason retained when applicable

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

## Acceptance traceability

- Runtime load and fast-path scan criteria -> `/scanning/:scanPointId` runtime implementation -> Valid scan and rapid repeat scan tests.
- Validation vocabulary and override criteria -> Approved reason-code + overridable/non-overridable contracts -> Rejection class and override-permission tests.
- Manual scan and permission criteria -> Manual operator flow + RBAC access control -> Manual scan attribution and unauthorized access tests.

## Manual QA pack requirements

- Scenarios: Execute verification flows for valid scans, manual scans, each rejection class, allowed/non-allowed overrides, and denied access.
- Expected outcomes: Runtime results remain explicit, auditable, and aligned to approved validation vocabulary.

## Build execution rules

- Backend schema, RPC, and RLS changes are allowed only when the exact delta is pre-listed in `docs/delivery/backend-delta-backlog.md` and linked from this slice before implementation.
- Stop on blockers: unresolved validation_result/validation_reason schema direction, missing override contract behavior, or missing runtime permission mapping.

## Done criteria

- Tests pass: Runtime outcome, override boundary, manual scan, and permission tests pass.
- QA passed: Manual QA evidence for verification scenarios is captured.
- Docs updated: BA13 remains aligned with BA12/BA14 boundaries and scanning authority references.

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

- [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- [`./BA00-base-project-brief.md`](./BA00-base-project-brief.md)
- the implementation plan in [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- the pace-core2 compliance rules in [`./BA00-base-architecture.md`](./BA00-base-architecture.md)
- [`../../../database/decisions/DB-change-decisions-p1.md`](../../../database/decisions/DB-change-decisions-p1.md) (legacy decision archive)
- [`../../../database/domains/base.md`](../../../database/domains/base.md)

---

## Prompt to use with Cursor

Implement the feature described in this document. Follow the standards and guardrails provided. Add or update tests and verification (demo app for pace-core, or in-app for consuming apps) as specified in "Testing requirements" and "Verification". Run validate and fix any issues until it passes.

---

**Checklist before running Cursor:** intro doc + guardrails doc + Cursor rules + ESLint config + this requirements doc.
