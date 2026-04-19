## Overview

S09 owns the organiser-facing activity offering and session setup surface. It covers `/activities` and `/activities/:offeringId` and uses the shared authenticated BASE shell and layout contract.

This slice is about configuring what participants can later book. It is not the participant booking experience itself, and it is not an oversight dashboard for existing bookings.

## Current legacy baseline

- No legacy activity setup page exists in the current app snapshot.
- The generated schema types expose `trac_activity`, which looks like the closest legacy-adjacent activity record, but there is no dedicated organiser UI for activity offering/session configuration.
- There is no current legacy route for `/activities` or `/activities/:offeringId`.

## Rebuild target

- Provide organiser tooling for event-scoped activity offerings and their sessions.
- Support booking window fields, capacity-related data, optional pricing fields, optional payment due dates, and optional TRAC linkage.
- Treat offering setup and session setup as one bounded organiser workflow, not as participant booking.
- Keep participant booking behaviour and organiser oversight out of this slice.

## pace-core2 delta

- Use shared `pace-core2` components for tables, dialogs, forms, date/time presentation, and shell composition.
- Use scoped hooks and branded IDs rather than raw string propagation.
- Use the shared authenticated shell and permission guards; do not recreate routing or context management locally.
- Do not depend on legacy assumptions about activity records or ad hoc client-side persistence.

## pace-core2 imports

- `@solvera/pace-core/components`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/events`
- `@solvera/pace-core/location`
- `@solvera/pace-core/rbac`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`

## Data and schema references

- `base_activity_offering`
- `base_activity_session`
- `trac_activity`
- `core_events`

## Acceptance criteria

- `/activities` lists the event's configured activity offerings.
- `/activities/:offeringId` opens an edit/setup surface for one offering and its sessions.
- Booking window, capacity, date/time, and optional TRAC linkage fields are explicit in the rebuild contract.
- Saving invalid session or offering data fails validation before persistence.
- Permission failures are surfaced clearly for unauthorised event operators.

## API / Contract

- Activity offering list/create/update/delete contract.
- Activity session list/create/update/delete contract nested under an offering.
- Optional TRAC linkage contract for an offering.
- Validation contract for booking windows, capacities, and time fields.
- Route ownership contract for `/activities` and `/activities/:offeringId`.

## Visual specification

- Use the shared authenticated BASE shell and the shared layout contract.
- Keep the list view compact and operational.
- Use a dedicated editor experience for a single offering, with sessions shown clearly and not hidden inside generic form noise.
- Present capacity, window, and optional TRAC linkage as first-class summary information.

## Verification

- List offerings for an event.
- Open an offering by ID and edit its session setup.
- Create valid sessions and reject invalid time or capacity combinations.
- Confirm access denied states for users without the required permission.

## Testing requirements

- Happy path: create an offering and a session, then reopen the offering and verify persisted values.
- Validation failure: reject missing required fields, invalid booking windows, or invalid capacity values.
- Auth/permission failure: reject unauthorised access to listing and edit operations.

## Open questions

None currently.

## Do not

- Do not leak participant booking UX into this page.
- Do not treat `trac_activity` as the booking record.
- Do not invent waitlist or booking-state rules here.
- Do not silently preserve legacy client-side persistence patterns.

## References

- [`../project-brief.md`](../project-brief.md)
- [`../architecture.md`](../architecture.md)
