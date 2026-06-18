# BA10 — Participant Activity Booking Experience

## Slice metadata

- Status: Draft
- Depends on: BA02 (shared forms platform contracts), BA05a (participant identity and application context), BA08 (unit coordination and group context), BA09 (activity offering and session setup)
- Backend impact: Read contract only — all write operations (booking create, booking cancel, consent write) are external/backend-owned contracts
- Frontend impact: Both — BASE defines projection and dependency contracts; pace-portal consumes them as the participant booking UI

---

## 2. Overview

BA10 defines the projection and dependency contracts that BASE publishes for participant activity booking. The participant-facing booking journey UI is owned by pace-portal (`/:eventSlug/activities`); BASE contributes the read projection contract, validation projection contract, and the table/schema contracts that downstream slices consume.

This slice is the **participant booking contract** slice, not organiser setup (BA09) or organiser booking oversight (BA11).

BASE owns no UI routes in this slice. Every normative section in this document describes a **contract BASE exposes**, not a screen BASE renders. The primary deliverables are:

- Browse offering and session projection contract
- Booking outcome projection contract (all seven failure classes)
- Booking-time consent requirement projection contract
- Eligibility and conflict validation projection contract
- Waitlist projection contract
- Cancellation `cancellable: boolean` per-booking projection contract
- `base_activity_booking` status semantics published to BA11 and BA15

---

## 3. What this slice delivers

### Purpose

Participants need to discover activity offerings, understand their booking eligibility, and receive clear outcomes whether their booking succeeds, lands on a waitlist, or is blocked. BASE provides the projection contracts that give pace-portal all the information it needs to drive those outcomes. BASE also defines the conditions under which a booking is cancellable, so pace-portal can surface a cancel action only when it is valid.

### Surfaces

**No BASE-owned UI surfaces.** All participant-facing UI runs in pace-portal:

- pace-portal `/:eventSlug/activities` — browse offerings, browse sessions, initiate booking (portal PR19)
- pace-portal booking outcome states — all seven failure classes rendered by portal; BASE supplies the projection data
- pace-portal consent capture surface — BASE projects consent requirement; portal renders the consent form; consent write is an external/backend contract

### Boundaries

- This slice does not own any BASE-origin participant routes. Participant booking UI is implemented exclusively in pace-portal (AD-001).
- Booking write (create, cancel) is an external/backend-owned contract. BASE does not directly write to `base_activity_booking` from a client (AD-003).
- Consent write is an external/backend-owned contract. BASE does not directly write to `base_consent` from a client.
- Waitlist auto-promotion is not part of this slice. Promotion from waitlisted to confirmed requires explicit approval (manual or scheduled-job based) and is out of MVP scope.
- This slice does not merge booking with registration, unit preference submission, or any other workflow.
- `base_activity_preference` (ranked group preferences) is a **conditional** read dependency — only projection calls that require ranked group context join this table. All other booking projections do not join it.

### Architectural posture

- All BASE-side reads use **`useSecureSupabase()`** from `@solvera/pace-core/rbac`. No service-role client in contract-layer code.
- Booking validation projection is a **read-side contract** — BASE returns the computed validation state; it does not mutate any booking record.
- The `cancellable: boolean` flag is computed server-side from `base_activity_booking.status` and `base_activity_session.start_time`. The consumer (pace-portal) does not re-apply cancellability rules.
- All failure classes are returned in a single projection response. pace-portal determines display priority.
- RLS for booking projection tables follows the canonical `check_rbac_permission_with_context('read:page.[pagename]', '[pagename]', organisation_id, event_id::text, get_app_id('BASE'))` pattern once tables are migrated.

---

## 4. Functional specification

### Browse offerings and sessions projection

**BR-Browse-01 —** BASE exposes a read projection of `base_activity_offering` rows for an event, filtered to the authenticated participant's context. Each offering row includes: `id`, `name`, display fields (description, location), booking window fields (`booking_open_at`, `booking_close_at`), and `bookingWindowOpen: boolean` (computed — see BR-Outcome-1).

**BR-Browse-02 —** For each offering, BASE exposes associated `base_activity_session` rows including: `id`, `session_name`, `start_time`, `end_time`, location display fields, `capacity`, and computed `capacityFull: boolean` (see BR-Outcome-2). The waitlist flag (`allow_waitlist`) is sourced from `base_activity_offering`, not the session.

**BR-Browse-03 —** The browse projection is scoped to the authenticated participant context. A participant cannot retrieve offering or session projections outside their event scope.

### Booking outcome projection

**BR-Outcome-Contract —** BASE's validation projection endpoint accepts a `(participant_id, session_id)` pair and returns a `BookingValidationResult` object containing all applicable failure classes simultaneously. pace-portal receives the full result and determines which failure class to surface first. No short-circuit termination; all seven failure classes are evaluated.

**BR-Outcome-1 (Booking window) —** BASE projects `bookingWindowOpen: boolean` on each offering. When `booking_open_at` is null AND `booking_close_at` is null, the offering is always open for booking — no window enforcement applies. When either field is non-null, BASE evaluates whether the current timestamp falls within `[booking_open_at, booking_close_at]`. Null `booking_open_at` means no open-boundary enforcement; null `booking_close_at` means no close-boundary enforcement.

**BR-Outcome-2 (Capacity) —** BASE projects `capacityFull: boolean` on each session. Only `confirmed` bookings count toward `base_activity_session.capacity`. Cancelled bookings release their capacity slot and do not count. Waitlisted bookings do not consume a capacity slot — they occupy the overflow queue. `capacityFull: true` when the count of `confirmed` bookings for the session equals or exceeds `capacity`.

**BR-Outcome-3 (Duplicate booking) —** In the validation projection, BASE returns `duplicateBooking: true` when the participant already has a non-cancelled booking (status `confirmed` or `waitlisted`) for the same `session_id`. The consumer must not present a booking action affordance when `duplicateBooking: true`.

**BR-Outcome-4 (Session conflict) —** In the validation projection, BASE returns `sessionConflict: true` when the participant has an active booking for another session whose `[start_time, end_time]` range overlaps the target session's range. When a conflict exists, BASE additionally returns `conflictingSession: { session_id, session_name, start_time }` so pace-portal can display which session conflicts.

**BR-Outcome-5 (Eligibility denial) —** In the validation projection, BASE returns `eligibilityDenied: boolean`. For v1, no eligibility reason code is returned. Reason codes are deferred until the eligibility rule taxonomy is defined. The consumer displays a generic eligibility denial message when `eligibilityDenied: true`.

**BR-Outcome-6 (Consent required) —** BASE projects `consentRequired: boolean` and, when true, `consentText: string` (the verbatim consent text from `base_consent` for the offering). This is a **blocking gate** — the booking write must not be invoked before consent is acknowledged. The consumer renders the consent acknowledgement surface; consent write is an external/backend contract.

### Waitlist projection

**BR-Waitlist —** When a session has `capacityFull: true` and `allow_waitlist: true` on `base_activity_offering`, BASE projects `waitlistOpen: true`. A booking placed under these conditions results in a `base_activity_booking` row with `status = 'waitlisted'`. BASE projects `onWaitlist: true` on the participant's booking projection when their booking status is `waitlisted`. The waitlist outcome is distinct from a hard block (`capacityFull: true`, `allow_waitlist: false`) and from a confirmed booking. Waitlist auto-promotion is not part of this contract.

### Consent requirement projection

**BR-Consent —** BASE evaluates whether `base_activity_offering` requires consent for the authenticated participant. When consent is required, BASE projects `consentRequired: true` and `consentText: string` in the booking pre-flight result. The participant must acknowledge the consent on the pace-portal surface before the booking write is invoked. BASE does not record the consent acknowledgement — that is the external backend contract.

### Eligibility and conflict validation projection

**BR-Validation —** BASE provides a pre-flight validation projection that pace-portal calls before invoking the external booking write. The projection evaluates all applicable failure classes simultaneously and returns a single `BookingValidationResult` object. This is a **read-only** operation — no state is mutated. The result contains all of: `bookingWindowOpen`, `capacityFull`, `waitlistOpen`, `duplicateBooking`, `sessionConflict`, `conflictingSession` (when applicable), `eligibilityDenied`, `consentRequired`, `consentText` (when applicable).

### Cancellation projection

**BR-Cancellation —** BASE projects `cancellable: boolean` on each of the authenticated participant's booking rows. A booking is cancellable when:
- `base_activity_booking.status` is `confirmed`, AND
- `base_activity_session.start_time` has not yet passed at the time of the projection read.

Waitlisted bookings are **not** cancellable via this flag in v1 — that semantic is left to the external cancellation contract. There is no cancellation window constraint in v1. The consumer must not present a cancel action affordance when `cancellable: false`.

### Permission-scoped projection

**BR-Permission —** All projection reads are scoped to the authenticated participant context. Participants cannot read booking projection data for other participants. Organisers access booking data through BA11 (oversight), not through BA10's participant projection.

---

## 5. Visual specification (portal)

BASE delivers projection and booking RPC contracts only; **pace-portal** owns UI (**PR19**).

- **Prototype reference:** `ActivityBookingPage` in `pace-prototype/apps/pace-portal/pages/EventParticipantPages.jsx`; route `event-activities` in `app.jsx` (`#/events/:code/activities`).

### Prototype layout summary

1. **PageHeader** — breadcrumb Dashboard → event → "Activity booking"; **Back to event** secondary.
2. **Action error banner** — warn banner when booking action fails (optional).
3. **Your bookings card** — list rows: offering name, session + time range, status badge (+ waitlist hint), **Cancel** ghost when cancellable; empty state when none.
4. **Available activities card** — offering **article** cards with name, booking-closed badge, description, session rows: when/capacity (count/capacity, Full / Waitlist open badges), **Book session** / **Join waitlist** primary; expanded row shows optional consent **Checkbox** + Cancel / **Confirm booking** (or waitlist confirm).
5. **Cancel confirmation** — `ConfirmationDialog` destructive confirm for cancellation.

Session actions honour **`bookingWindowOpen`**, **`capacityFull`**, **`waitlistOpen`** from BA10 projection rules (§6).

### Route map (prototype → portal)

| Prototype hash | Portal (pace-portal) | BASE role |
|---|---|---|
| `#/events/:code/activities` | `/:eventSlug/activities` or equivalent (PR19) | Offering/session browse + book/cancel RPCs |

### Implementation delta (pass 2)

- No BASE-owned UI in `src/` — pace-portal2 implements browse/book/cancel flows against BA10 contracts.
- Prototype uses inline session expand for confirm; portal may use dialog — same fields and gating.

---

## 6. Business rules

### BR-Outcome-1: Booking window projection

**Trigger:** pace-portal requests the offering browse projection or the pre-flight validation result for a `(participant_id, session_id)` pair.
**Computation:** BASE evaluates `booking_open_at` and `booking_close_at` on `base_activity_offering`.
- If both are null: `bookingWindowOpen: true` (no restriction — always open).
- If `booking_open_at` is null and `booking_close_at` is non-null: open if `now() <= booking_close_at`.
- If `booking_open_at` is non-null and `booking_close_at` is null: open if `now() >= booking_open_at`.
- If both are non-null: open if `booking_open_at <= now() <= booking_close_at`.

**Consumer obligation:** When `bookingWindowOpen: false`, pace-portal renders a distinct "booking window closed" state and presents no booking action affordance.

### BR-Outcome-2: Capacity full projection

**Trigger:** Session browse projection or pre-flight validation.
**Computation:** `capacityFull: true` when `COUNT(base_activity_booking WHERE session_id = X AND status = 'confirmed') >= base_activity_session.capacity`.
**Counting rules:**
- Only `confirmed` bookings count toward capacity.
- `cancelled` bookings do not count (they release their slot).
- `waitlisted` bookings do not count (they are in the overflow queue).

**Consumer obligation:** When `capacityFull: true` and `waitlistOpen: false`, pace-portal renders a distinct "capacity full / no waitlist" state. When `capacityFull: true` and `waitlistOpen: true`, pace-portal renders a distinct waitlist affordance.

### BR-Outcome-3: Duplicate booking detection

**Trigger:** Pre-flight validation for a `(participant_id, session_id)` pair.
**Computation:** `duplicateBooking: true` when a `base_activity_booking` row exists where `participant_id = X` AND `session_id = Y` AND `status IN ('confirmed', 'waitlisted')`.
**Consumer obligation:** When `duplicateBooking: true`, pace-portal renders a distinct "already booked" state and presents no booking action affordance.

### BR-Outcome-4: Session conflict detection

**Trigger:** Pre-flight validation for a `(participant_id, session_id)` pair.
**Computation:** BASE queries all active bookings for the participant (`status IN ('confirmed', 'waitlisted')`), retrieves their session time ranges, and checks whether any overlaps with the target session's `[start_time, end_time]`.
**Projection shape when conflict detected:** `sessionConflict: true`, `conflictingSession: { session_id: uuid, session_name: string | null, start_time: timestamptz }`.
**Consumer obligation:** When `sessionConflict: true`, pace-portal renders a distinct "session conflict" state and surfaces the conflicting session display fields so the participant can make an informed decision.

### BR-Outcome-5: Eligibility denial projection

**Trigger:** Pre-flight validation.
**Computation:** BASE evaluates whether the participant meets eligibility requirements for the offering. Eligibility rules reference the participant's application context (BA05a) and unit membership context (BA08) where applicable.
**Projection:** `eligibilityDenied: boolean`. No reason code in v1 — reason codes are deferred until the eligibility rule taxonomy is defined.
**Consumer obligation:** When `eligibilityDenied: true`, pace-portal renders a distinct "eligibility denial" state with a generic denial message. No booking action affordance is presented.

### BR-Outcome-6: Consent required blocking gate

**Trigger:** Pre-flight validation.
**Computation:** BASE evaluates whether `base_activity_offering` requires consent for the participant AND whether a valid consent record already exists for this participant + offering combination.
**Projection:** `consentRequired: boolean`, `consentText: string` (verbatim consent text when required).
**Gate behaviour:** This is a submit-time blocking gate. The booking write must not be invoked until the participant has acknowledged consent on pace-portal's consent surface. The consent write is an external/backend contract — BASE does not record consent.
**Consumer obligation:** When `consentRequired: true`, pace-portal renders the consent acknowledgement surface with `consentText` verbatim before enabling the booking submit action.

### BR-Waitlist: Waitlist outcome

**Trigger:** `capacityFull: true` AND `base_activity_offering.allow_waitlist = true`.
**Projection:** `waitlistOpen: true` on the session. A booking placed in this state results in `base_activity_booking.status = 'waitlisted'`. The participant's booking projection returns `onWaitlist: true`.
**Promotion constraint:** BASE does not auto-promote waitlisted bookings to confirmed. Promotion requires explicit approval (manual or scheduled-job based) and is outside this slice's scope.
**Consumer obligation:** pace-portal renders the waitlist outcome distinctly from a hard capacity block and from a confirmed booking.

### BR-Validation: Multi-outcome pre-flight validation

**Trigger:** pace-portal calls the BA10 validation projection before invoking the external booking write.
**Result shape:** All seven applicable failure classes are returned simultaneously in a single `BookingValidationResult` response (see §7 for the exact interface). BASE does not short-circuit or prioritise.
**Consumer responsibility:** pace-portal determines which failure class to surface first. Recommended display priority (informational only — pace-portal may override): booking window → eligibility → capacity/waitlist → duplicate → conflict → consent.

### BR-Cancellation: Cancellable flag computation

**Trigger:** Participant's booking list projection.
**Computation:** `cancellable: true` when `status = 'confirmed'` AND `base_activity_session.start_time > now()`.
**v1 constraints:** No cancellation window (e.g., no "no cancellations within N hours" rule). Waitlisted bookings: `cancellable: false` in v1.
**Consumer obligation:** pace-portal renders a cancel action affordance only when `cancellable: true`. Cancellation write is an external/backend contract.

---

## 7. API / Contract

### 7.1 Offering browse projection

**Contract:** `GET /base/offerings?event_id=<uuid>` (or equivalent RPC/query)

```typescript
interface OfferingBrowseItem {
  id: string;                      // base_activity_offering.id
  name: string;
  description: string | null;
  location_display: string | null;
  booking_open_at: string | null;  // timestamptz ISO string
  booking_close_at: string | null; // timestamptz ISO string
  bookingWindowOpen: boolean;      // computed — see BR-Outcome-1
  sessions: SessionBrowseItem[];
}

interface SessionBrowseItem {
  id: string;                      // base_activity_session.id
  session_name: string | null;     // base_activity_session.session_name
  start_time: string;              // timestamptz ISO string
  end_time: string;                // timestamptz ISO string
  location_display: string | null;
  capacity: number;
  allow_waitlist: boolean;         // base_activity_offering.allow_waitlist (sourced from parent offering)
  capacityFull: boolean;           // computed — see BR-Outcome-2
  waitlistOpen: boolean;           // computed — capacityFull AND allow_waitlist
  confirmedCount: number;          // count of confirmed bookings for this session
}
```

**Scope:** Scoped to authenticated participant's event context. Participant cannot retrieve offerings outside their event scope.

### 7.2 Booking validation projection

**Contract:** `POST /base/bookings/validate` (or equivalent RPC) — read-only; no state mutation.

**Request:**

```typescript
interface BookingValidationRequest {
  participant_id: string;          // authenticated participant's person ID
  session_id: string;
}
```

**Response:**

```typescript
interface BookingValidationResult {
  // Booking window (BR-Outcome-1)
  bookingWindowOpen: boolean;

  // Capacity and waitlist (BR-Outcome-2, BR-Waitlist)
  capacityFull: boolean;
  waitlistOpen: boolean;

  // Duplicate booking (BR-Outcome-3)
  duplicateBooking: boolean;

  // Session conflict (BR-Outcome-4)
  sessionConflict: boolean;
  conflictingSession: {
    session_id: string;
    session_name: string | null;
    start_time: string;            // timestamptz ISO string
  } | null;

  // Eligibility (BR-Outcome-5)
  eligibilityDenied: boolean;
  // eligibilityReasonCode: deferred — not returned in v1

  // Consent (BR-Outcome-6)
  consentRequired: boolean;
  consentText: string | null;      // verbatim consent text when consentRequired: true

  // Derived: BASE sets canBook: true only when all server-evaluable conditions pass:
  //   bookingWindowOpen: true
  //   !capacityFull || waitlistOpen
  //   !duplicateBooking
  //   !sessionConflict
  //   !eligibilityDenied
  // BASE does NOT factor consent acknowledgement into canBook — consent
  // acknowledgement is portal-side state (tracked by pace-portal, not BASE).
  // pace-portal must additionally gate the submit action on its own consent-
  // acknowledged flag before invoking the external booking write.
  canBook: boolean;                // convenience flag — computed from the server-evaluable conditions above; does not include consent acknowledgement
}
```

**Consumer obligations per failure class:**

| Failure class | Field(s) | Consumer obligation |
|---|---|---|
| `booking-window-closed` | `bookingWindowOpen: false` | Render distinct "booking closed" state; no booking affordance |
| `capacity-full` | `capacityFull: true`, `waitlistOpen: false` | Render "capacity full" state; no booking affordance |
| `waitlist-open` | `capacityFull: true`, `waitlistOpen: true` | Render waitlist join affordance; submit leads to `waitlisted` booking |
| `duplicate-booking` | `duplicateBooking: true` | Render "already booked" state; no booking affordance |
| `session-conflict` | `sessionConflict: true` | Render conflict state with `conflictingSession` display fields |
| `eligibility-denial` | `eligibilityDenied: true` | Render generic eligibility denial; no booking affordance |
| `consent-required` | `consentRequired: true` | Render consent form with `consentText`; block submit until acknowledged |

### 7.3 Participant booking list projection

**Contract:** `GET /base/bookings?participant_id=<uuid>&event_id=<uuid>` (or equivalent RPC/query)

```typescript
interface ParticipantBookingItem {
  id: string;                      // base_activity_booking.id
  session_id: string;
  session_name: string | null;
  start_time: string;              // timestamptz ISO string
  end_time: string;                // timestamptz ISO string
  offering_name: string;
  status: 'confirmed' | 'waitlisted' | 'cancelled';
  booked_at: string;               // timestamptz ISO string
  cancelled_at: string | null;
  cancellable: boolean;            // computed — see BR-Cancellation
  onWaitlist: boolean;             // status === 'waitlisted'
}
```

### 7.4 Write contracts (external/backend-owned — not BASE client writes)

The following write operations are external/backend-owned contracts. BASE does not execute these writes from a client. They are defined here as contract boundaries for downstream integrators.

**Booking create:**

```typescript
// Invoked by external backend after successful BookingValidationResult
// Creates base_activity_booking row
interface BookingCreateInput {
  participant_id: string;
  session_id: string;
  source: string;                  // 'self' | 'coordinator' | 'allocation'
  // status is computed by backend: 'confirmed' if capacity available; 'waitlisted' if waitlist open
}
interface BookingCreateResult {
  booking_id: string;
  status: 'confirmed' | 'waitlisted';
}
```

**Booking cancel:**

```typescript
// Invoked by external backend; only valid when cancellable: true
interface BookingCancelInput {
  booking_id: string;
  participant_id: string;          // identity check
}
// Sets base_activity_booking.status = 'cancelled', cancelled_at = now()
```

**Consent write:**

```typescript
// Invoked by external backend after participant acknowledges consentText
interface ConsentWriteInput {
  offering_id: string;
  booking_id: string;              // anchor to booking (mutually exclusive with application_id)
  consented_by: string;            // UUID of the acknowledging actor
  consented_for: string;           // UUID of the participant
  verbatim_text: string;           // must match consentText returned by validation projection
}
```

### 7.5 Cross-slice handoffs

| Direction | Slice | What is exchanged |
|---|---|---|
| Consumes | **BA05a** | Participant identity and application context — eligibility checks reference `base_application.status` and `registration_type_id` |
| Consumes | **BA08** | Unit hierarchy and `base_units` read — unit-aware eligibility; `base_activity_preference` conditional read for ranked group context |
| Consumes | **BA09** | `base_activity_offering` and `base_activity_session` table contracts — booking window config, capacity, `allow_waitlist` (on offering) |
| Publishes | **BA11** | `BA10.contract` — booking projection and validation contracts; `base_activity_booking` table contract including status semantics |
| Publishes | **BA15** | `base_activity_booking` table contract consumed by the `base.activity` reporting explore |
| Consumer | **pace-portal PR19** | All projection contracts above — pace-portal renders the participant booking surface against BA10's read projections |

### 7.6 RPC error conventions

Participant-facing projection RPCs follow the architecture's SECURITY DEFINER error convention. Authorisation denial raises `RAISE EXCEPTION 'base_booking_access_denied'` with SQLSTATE `P0001`. There is no distinction between "row does not exist" and "caller lacks permission" (oracle-attack prevention). pace-portal catches PostgREST error responses and dispatches on the `message` field to map to the appropriate UX state.

---

## 8. Data and schema references

| Artefact | Role | Status |
|----------|------|--------|
| **`base_activity_offering`** | Offering browse projection root; booking window fields (`booking_open_at`, `booking_close_at`), consent config; `allow_waitlist boolean NOT NULL DEFAULT false` | In dev-db — confirmed (`rkytnffgmwnnmewevqgp`) |
| **`base_activity_session`** | Session browse projection; `session_name text NULLABLE`, `capacity`, `start_time`, `end_time`, location display fields. No `waitlist_enabled` column — waitlist flag lives on `base_activity_offering.allow_waitlist` | In dev-db — confirmed (`rkytnffgmwnnmewevqgp`) |
| **`base_activity_booking`** | Participant booking rows; `status: 'confirmed' \| 'waitlisted' \| 'cancelled'`, `source`, `booked_at timestamptz NOT NULL DEFAULT now()`, `cancelled_at timestamptz NULLABLE` | In dev-db — confirmed (`rkytnffgmwnnmewevqgp`); status enum per Q-8 resolution |
| **`base_consent`** | Consent records anchored to booking; `verbatim_text`, `consented_by`, `consented_for` | In dev-db — confirmed (`rkytnffgmwnnmewevqgp`) |
| **`base_application`** | Read-only — participant identity and eligibility context from BA05a | In dev-db |
| **`base_units`** | Read-only — unit membership context for eligibility from BA08 | In dev-db |
| **`base_activity_preference`** | Conditional read — ranked group context when source rules require it; not joined unconditionally | Forward contract — not yet confirmed in dev-db |
| **`core_events`** | Event scope resolution | In dev-db |

**Dead-link note:** v5 slice references `../../database/domains/base.md` as schema authority. This file does not exist (confirmed by platform snapshot). Schema authority for BA10's forward tables derives from this slice document, the v5 slice text, and `BASE-architecture.md §6`.

**RLS pattern for forward tables:** Once migrated, booking/consent tables use `check_rbac_permission_with_context('read:page.[pagename]', '[pagename]', organisation_id, event_id::text, get_app_id('BASE'))`. New tables must not use the older `check_user_is_event_creator` pattern from `base_units`.

---

## 9. pace-core2 imports

### §9.1 Imports table

| Symbol | Import path | One-line why |
|--------|-------------|--------------|
| `ApiResult`, `ApiError`, `ok`, `err`, `isOk`, `isErr`, `normalizeToApiError` | `@solvera/pace-core/types` | Projection contract return types; validation result typing |
| `EventId`, `OrganisationId`, `UserId` | `@solvera/pace-core/types` | Branded ID types at feature boundary |
| `collectSourceErrors`, `composeResilientState` | `@solvera/pace-core/resilience` | Resilience pattern for multi-source projection reads (offering + session + booking + consent reads may be composed) |
| `useEvents` | `@solvera/pace-core/hooks` | Event context at the feature boundary — `selectedEvent.id` |
| `useUnifiedAuth` | `@solvera/pace-core/hooks` | Participant identity context |
| `useSecureSupabase` | `@solvera/pace-core/rbac` | RLS-aware Supabase client for all projection reads |

### §9.2 Slice-specific caveats

**`collectSourceErrors` and `composeResilientState` — multi-source projection composition**

The BA10 validation projection aggregates results from multiple read sources (offering, session, booking, application, consent). When composing these into a single `BookingValidationResult`, use `collectSourceErrors` to accumulate errors across sources rather than short-circuiting on the first failure. This ensures a complete validation result is always returned.

**`useEvents()` — field name**

`selectedEvent.id` is the canonical event identifier. Do not use `selectedEvent.event_id` — that field does not exist on `EventStub`.

**`base_activity_preference` — conditional join only**

`base_activity_preference` is joined only when source rules require ranked group context. Do not unconditionally join this table in the standard browse or validation projections — it adds latency and complexity for the common case.

---

## 10. Permission and access rules

| Surface | Permission | Enforcement |
|---------|-----------|-------------|
| Read offering/session browse projection | Authenticated participant context scoped to their event | RLS on `base_activity_offering` / `base_activity_session` (forward — once tables are migrated) |
| Read validation projection | Authenticated participant, scoped to their `participant_id` | RLS + SECURITY DEFINER RPC pattern |
| Read participant booking list | Authenticated participant, own bookings only | RLS on `base_activity_booking` scoped to `participant_id` |
| Booking write | External/backend-owned; not a client-accessible operation | AD-003 architectural constraint |
| Consent write | External/backend-owned; not a client-accessible operation | AD-003 architectural constraint |
| Organiser access to booking data | Separate BA11 contract — not BA10's participant projection | BA11 owns the organiser oversight surface |

---

## 11. Acceptance criteria

- Given a participant context and an event with offerings, the browse projection returns offerings with `bookingWindowOpen`, session `capacityFull`, and `waitlistOpen` fields correctly computed.
- Given `booking_open_at: null` and `booking_close_at: null` on an offering, `bookingWindowOpen: true` is returned (no restriction).
- Given `booking_open_at: null` and a non-null `booking_close_at` in the future, `bookingWindowOpen: true` is returned.
- Given a non-null `booking_open_at` in the past and `booking_close_at: null`, `bookingWindowOpen: true` is returned (no close-boundary enforcement).
- Given a non-null `booking_open_at` in the future and `booking_close_at: null`, `bookingWindowOpen: false` is returned (open boundary not yet reached).
- Given both `booking_open_at` and `booking_close_at` non-null and the current timestamp within the window, `bookingWindowOpen: true` is returned.
- Given both `booking_open_at` and `booking_close_at` non-null and the current timestamp after `booking_close_at`, `bookingWindowOpen: false` is returned.
- Given a session where `confirmed` booking count equals `capacity`, `capacityFull: true` is returned.
- Given a `cancelled` booking for a session, that booking does not count toward capacity (capacity slot is released).
- Given a `waitlisted` booking for a session, that booking does not count toward capacity.
- Given `capacityFull: true` and `allow_waitlist: true` on the offering, `waitlistOpen: true` is returned.
- Given `capacityFull: true` and `allow_waitlist: false` on the offering, `waitlistOpen: false` is returned.
- Given a participant who already has a `confirmed` booking for a session, the validation projection returns `duplicateBooking: true`.
- Given a participant who already has a `waitlisted` booking for a session, the validation projection returns `duplicateBooking: true`.
- Given a participant with a conflicting session booking (time overlap), the validation projection returns `sessionConflict: true` and `conflictingSession` with `session_id`, `session_name`, and `start_time`.
- Given a participant who does not meet offering eligibility requirements, `eligibilityDenied: true` is returned; no reason code is returned in v1.
- Given an offering requiring consent and the participant has not yet consented, `consentRequired: true` and `consentText` (verbatim) are returned.
- Given multiple failure classes apply simultaneously (e.g. window closed AND eligibility denied), the validation projection returns all applicable failure fields populated; none are suppressed.
- Given a `confirmed` booking where `start_time` is in the future, the participant booking list projection returns `cancellable: true`.
- Given a `confirmed` booking where `start_time` has passed, `cancellable: false` is returned.
- Given a `waitlisted` booking, `cancellable: false` is returned.
- Given a `cancelled` booking, `cancellable: false` is returned.
- Given a participant without permission for the booking projection scope, the RPC raises `base_booking_access_denied`.

---

## 12. Verification

1. **Contract (browse projection):** Call the offering browse projection for a seeded event (BA18). Verify `bookingWindowOpen`, `capacityFull`, `waitlistOpen` are correctly computed for a range of offering/session configurations including null window fields.
2. **Contract (capacity counting):** Seed `confirmed`, `waitlisted`, and `cancelled` bookings. Verify `capacityFull` reflects only `confirmed` count; cancelled does not count; waitlisted does not count.
3. **Contract (validation — booking window):** Validate a booking against an offering where: (a) window is null/null → open; (b) window is past → closed; (c) window is future start with null close → closed; (d) current time in window → open.
4. **Contract (validation — duplicate):** Validate a booking where the participant already has `confirmed` and `waitlisted` bookings for the same session. Verify `duplicateBooking: true` in both cases.
5. **Contract (validation — conflict):** Validate a booking against a session that overlaps an existing confirmed booking. Verify `sessionConflict: true` and `conflictingSession` fields are populated.
6. **Contract (validation — multi-outcome):** Arrange a session where window is closed AND eligibility is denied. Verify both `bookingWindowOpen: false` and `eligibilityDenied: true` appear in the single response.
7. **Contract (cancellable flag):** Seed a `confirmed` booking with a future session, a `confirmed` booking with a past session, and a `waitlisted` booking. Verify `cancellable` is `true`, `false`, and `false` respectively.
8. **Contract (consent projection):** Seed an offering with consent required and no existing consent record for the participant. Verify `consentRequired: true` and `consentText` match the offering's verbatim consent text.
9. **Permission:** Attempt to access the booking projection with an unauthenticated or out-of-scope participant context. Verify `base_booking_access_denied` is raised.
10. **Seed dependency:** All contract verification scenarios require BA18 seed data for non-empty offering/session/booking states.

---

## 13. Testing requirements

**Automated minimum**

- BR-Outcome-1 unit tests: `bookingWindowOpen` computation for all four null/non-null window field combinations.
- BR-Outcome-2 unit tests: capacity counting — only `confirmed` count; `cancelled` releases; `waitlisted` excluded.
- BR-Outcome-3 unit tests: `duplicateBooking` for `confirmed` and `waitlisted` existing bookings; `cancelled` existing booking does not trigger duplicate.
- BR-Outcome-4 unit tests: `sessionConflict` detection for overlap, no-overlap, and adjacent (non-overlapping) time ranges.
- BR-Cancellation unit tests: `cancellable` computation for all status × timing combinations.
- BR-Validation integration test: call validation with multiple simultaneous failure conditions; verify all seven failure class fields populated in single response.
- Permission tests: projection calls denied for unauthenticated or out-of-scope participants.

---

## 14. Build execution rules

- **Stop** if any booking/consent write contract is missing or unresolved. Write contracts are external/backend dependencies; do not substitute stubs or invent client-side write paths.
- **Do not** add participant booking routes to the BASE admin app. All participant UI is pace-portal scope.
- **Do not** implement waitlist auto-promotion logic. Promotion is out of MVP scope.
- **Do not** merge booking with registration, unit preference submission, or any other workflow.
- **Do not** return eligibility reason codes in v1. The eligibility rule taxonomy is not yet defined; a boolean flag is the v1 contract.
- **Do not** apply a cancellation window constraint in v1 — there is no "no cancellations within N hours" rule.
- **Do not** unconditionally join `base_activity_preference` in browse or validation projections — it is a conditional dependency only.
- **Do not** use `window.confirm()` anywhere.
- Scope is the projection contract layer only. Do not absorb BA09 (offering setup), BA11 (oversight), or portal PR19 (UI) into this slice.

---

## 15. Done criteria

- All §11 acceptance criteria verified with contract-level evidence (not pre-ticked).
- §12 verification flows completed; results noted in build queue evidence.
- BA18 seed data confirmed available for non-empty contract verification.
- QA pack at `docs/test-packs/BA10-qa-pack.md` executed; quality gates green.
- `BA10.contract` (booking projection and validation contracts) confirmed ready for BA11 consumption.
- `base_activity_booking` status semantics confirmed stable for BA15 reporting explore.

---

## 16. Do not

- Do not add participant booking routes to the BASE app — pace-portal owns `/:eventSlug/activities` (AD-001).
- Do not execute booking write operations (create, cancel) from a BASE client — they are external/backend-owned contracts (AD-003).
- Do not execute consent write operations from a BASE client — external/backend-owned contract.
- Do not implement waitlist auto-promotion without explicit approval — not in scope for this wave.
- Do not merge booking with registration or unit preference submission.
- Do not return eligibility reason codes in v1 — deferred until the eligibility rule taxonomy is defined.
- Do not apply a cancellation window constraint in v1 — no such constraint exists.
- Do not short-circuit the multi-outcome validation projection — all failure classes must be evaluated and returned together.
- Do not unconditionally join `base_activity_preference` — it is a conditional read for ranked group context only.
- Do not use the older `check_user_is_event_creator` RLS pattern for new booking/consent tables — use the canonical `check_rbac_permission_with_context` helper.

---

## 17. References

- `docs/requirements/BASE-architecture.md` — §6 Participant Activity Booking; route ownership (BA10 → Portal lane); hybrid slice execution targets (BA10.contract); AD-001; AD-003.
- `docs/requirements/BA09-activity-offering-setup-requirements.md` — `base_activity_offering` and `base_activity_session` table contracts; `booking_open_at` / `booking_close_at` field names; `allow_waitlist` column on `base_activity_offering`.
- `docs/requirements/BA11-booking-operations-oversight-requirements.md` — consumes `BA10.contract`; organiser booking oversight and operations.
- `docs/requirements/BA05a-registration-entry-and-application-submission-requirements.md` — participant identity and application context consumed by eligibility projection.
- `docs/requirements/BA08-units-and-group-coordination-requirements.md` — unit hierarchy consumed by unit-aware eligibility projection.
- `docs/requirements/BA18-base-dev-seed-data-requirements.md` — seed data required for non-empty contract verification.
- `docs/requirements/BA15-reporting-requirements.md` — `base_activity_booking` table contract consumed by `base.activity` reporting explore.
