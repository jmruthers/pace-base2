## Overview

S11 owns the organiser-facing booking operations and oversight surface. It covers `/activities/bookings` and uses the shared authenticated BASE shell and layout contract.

This slice is about managing and inspecting booking state after participants have started booking. It is not participant booking, and it is not activity setup.

## Current legacy baseline

- No dedicated booking oversight page exists in the current legacy app snapshot.
- The generated schema types expose activity records, but not a complete organiser-facing booking operations UI.
- There is no current legacy route for `/activities/bookings`.

## Rebuild target

- Provide organiser-facing oversight of participant booking state for event-scoped activity workflows.
- Surface booking status, source, session context, and any relevant waitlist or capacity pressure information.
- Keep the page separate from participant booking and separate from activity setup.
- Allow only the booking operations explicitly approved for this slice:
  - inspect and filter bookings
  - create a booking on behalf of a participant
  - cancel an existing booking
  - manually promote a waitlisted participant
- Keep policy and state transition semantics backend-owned; do not invent additional organiser powers in the UI.

## pace-core2 delta

- Use `pace-core2` shared shell, tables, filters, dialogs, toasts, and RBAC helpers instead of page-local admin chrome.
- Use branded IDs and event-aware hooks rather than raw string plumbing.
- Keep permissions and access-denied handling on the shared guard path.
- Do not copy legacy admin patterns that assume a status-only booking model.

## pace-core2 imports

- `@solvera/pace-core/components`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/rbac`
- `@solvera/pace-core/events`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`

## Data and schema references

- `base_activity_booking`
- `base_activity_session`
- `base_activity_offering`
- `base_consent`
- `base_units`
- `core_events`

Operational booking contract decisions for this slice:

- organiser create-on-behalf must use the same backend booking-create contract as participant self-service, with booking source recorded as organiser/coordinator rather than participant self-service
- organiser cancellation does not require a cancellation reason in the current rebuild contract because no validated booking cancellation-reason field exists on `base_activity_booking`
- manual waitlist promotion is in scope and may choose any currently eligible waitlisted participant for the relevant session/offering context
- organiser actions may override capacity limits, booking window timing, waitlist ordering, and session-time conflicts
- organiser actions must not bypass core integrity checks such as required record existence, valid event scope, and invalid duplicate-active-booking states
- direct reassign is out of scope; moving a participant between sessions must remain an explicit cancel-plus-create sequence

## Acceptance criteria

- `/activities/bookings` shows organiser-visible booking oversight in the event context.
- Booking state, source, session, and related capacity or waitlist context are visible enough to support operations.
- Permission failures are enforced and visible.
- Create-on-behalf, cancel, and manual waitlist promotion are the only approved organiser mutations in MVP.
- Allowed mutations follow the authoritative booking contract rather than invented UI rules.
- Admin overrides for capacity, booking windows, waitlist ordering, and session conflicts are explicit rather than implicit side effects.

## API / Contract

- Booking oversight list and filter contract.
- Booking detail contract.
- Explicitly allowed booking operation contract for create-on-behalf, cancel, and manual waitlist promotion.
- Admin override contract for capacity, booking-window, waitlist-order, and session-conflict exceptions.
- Permission and denial contract for organiser oversight.
- Route ownership contract for `/activities/bookings`.

## Visual specification

- Use the shared authenticated BASE shell and the shared layout contract.
- Keep the main view dense and table-first, with filters and status chips that support operational scanning.
- Use a clear detail surface for a selected booking or row action so state changes are not buried in inline clutter.
- Make waitlist, conflict, and consent-related signals easy to spot.

## Verification

- Filter and inspect bookings for an event.
- Open booking detail and confirm the relevant context is shown.
- Create a booking on behalf of a participant and verify the source and state change are correct.
- Cancel a booking and verify the state change is correct.
- Manually promote a waitlisted participant and verify the promoted booking is created through the approved organiser path.
- Exercise an admin override for capacity or session conflict and verify the override path is explicit.
- Confirm denied access for users without the required permission.

## Testing requirements

- Happy path: list bookings, inspect a booking, and complete allowed organiser operations including create-on-behalf, cancel, or manual waitlist promotion.
- Validation failure: reject invalid filters or a disallowed state transition, including invalid duplicate-active-booking states.
- Auth/permission failure: reject unauthorised access to list, detail, or mutation paths.

## Open questions

None currently.

## Do not

- Do not invent booking rules inside the oversight UI.
- Do not make the oversight page the source of truth for booking policy.
- Do not collapse participant booking and organiser oversight into the same surface.
- Do not silently invent status transitions if the backend contract has not defined them.
- Do not add a generic override action that bypasses all backend validation.
- Do not add direct reassign as a first-class action in MVP.

## References

- [`../project-brief.md`](../project-brief.md)
- [`../architecture.md`](../architecture.md)
