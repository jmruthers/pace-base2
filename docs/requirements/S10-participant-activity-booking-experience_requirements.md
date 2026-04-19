## Overview

S10 owns the **participant activity booking workflow contract** (browse, selection, submission, waitlist outcomes, booking-time consent). **UI and routing** are **pace-portal** responsibilities (see [`PR00-portal-architecture.md`](../../portal/PR00-portal-architecture.md) and [`PR19-activity-booking.md`](../../portal/PR19-activity-booking.md)); canonical participant path is `/:eventSlug/activities`. The BASE app does **not** implement `/events/:eventCode/activities`.

This slice is the **participant** booking journey, not organiser setup (**S09**) or organiser oversight (**S11**).

## Current legacy baseline

- No legacy participant booking UI exists in the current BASE app snapshot.
- The current app has no dedicated BASE participant shell.
- The generated schema types surface activity records, but they do not expose a participant booking UI or workflow contract in the legacy code.

## Rebuild target

- Provide a participant-facing flow to browse activities and sessions, choose a session, and submit a booking.
- Enforce booking windows, capacity, duplicate prevention, and session conflict rules.
- Surface waitlist or blocked outcomes clearly and consistently.
- Trigger booking-time consent where required before the booking can complete.
- Own the participant-facing booking **behaviour and contracts**; **pace-portal** owns the booking **UI** (no BASE-origin participant route).

## pace-core2 delta

- Use shared `pace-core2` primitives for forms, validation, date/time handling, resilience, and component composition.
- Use branded IDs and shared hooks at the feature boundary.
- Do not wire participant booking UI into the BASE app; use **pace-portal** with the authenticated member shell.
- Do not carry forward legacy generic form submission assumptions into the booking workflow.

## pace-core2 imports

- `@solvera/pace-core/components`
- `@solvera/pace-core/hooks`
- `@solvera/pace-core/location`
- `@solvera/pace-core/resilience`
- `@solvera/pace-core/types`
- `@solvera/pace-core/utils`

## Data and schema references

- `base_activity_offering`
- `base_activity_session`
- `base_activity_booking`
- `base_consent`
- `core_events`
- `base_units` when source rules require unit-aware eligibility or context
- `base_activity_preference` when source rules require ranked group context
- **Product** route for the participant booking journey is **pace-portal** at `/:eventSlug/activities`; not a BASE-origin URL.

## Acceptance criteria

- A participant can browse offerings and sessions, select a session, and submit a booking from the participant surface.
- Booking windows, capacity, duplicate prevention, and conflict rules are enforced before persistence.
- Waitlist or blocked outcomes are shown clearly.
- Booking-time consent is requested and recorded when the contract requires it.
- The participant booking **UI** is **pace-portal**-owned; it does not use the BASE admin shell or organiser navigation.

## API / Contract

- Browse offerings and sessions contract.
- Booking create, cancel, and waitlist outcome contract.
- Booking-time consent trigger contract.
- Eligibility and conflict validation contract.
- Participant route ownership contract for the **pace-portal** booking journey at `/:eventSlug/activities`.

## Visual specification

- Use a participant-first layout, not the BASE admin shell.
- Keep the flow minimal, legible, and mobile-safe.
- Show session availability, capacity, and waitlist state prominently.
- Make consent gating and blocked states unmistakable.
- Provide lightweight participant navigation only; no organiser/admin navigation may leak into the route.

## Verification

- Browse an event's offerings and sessions.
- Submit a valid booking.
- Hit a capacity-full or conflict case and show the correct outcome.
- Complete a consent-required booking path.
- Confirm the experience runs on **pace-portal** and stays outside the BASE admin app.

## Testing requirements

- Happy path: browse, select, and submit a booking successfully.
- Validation failure: reject closed windows, full-capacity bookings, duplicate bookings, conflict cases, or missing consent where required.
- Auth/permission failure: reject unauthorised or inactive participant access to protected booking actions.

## Open questions

None currently.

## Do not

- Do not add participant booking routes to the **BASE** app; use **pace-portal**.
- Do not merge booking with registration or unit preference submission.
- Do not auto-promote waitlists without explicit approval.
- Do not ignore consent triggers or let them become an afterthought.

## References

- [`../project-brief.md`](../project-brief.md)
- [`../architecture.md`](../architecture.md)
