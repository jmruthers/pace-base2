# BA11 — Activity booking operations and oversight — QA pack

Manual verification aligned with [BA11-booking-operations-oversight-requirements.md](../requirements/BA11-booking-operations-oversight-requirements.md) §12.

## Prerequisites

- Authenticated organiser with appropriate RBAC for `bookings` page.
- Event selected in shell; use non-empty booking data per BA18 / slice QA setup where applicable.

## Read surface

1. Open `/activities/bookings`. Confirm **Bookings** heading, event name, and subtitle about managing bookings.
2. With bookings present, confirm **Activity Bookings** table columns: Participant, Offering, Session, Status, Source, Booked, Actions.
3. Confirm status badges: Confirmed (solid main), Waitlisted (outline acc muted), Cancelled (outline sec muted).
4. Confirm **initial order** by booked_at descending (newest first).

## Filters and search

5. Apply **status** filter (e.g. Confirmed); only matching rows remain.
6. Apply **session** and **offering** filters; list narrows correctly.
7. Use **search** across participant, offering, and session display text.

## Shell states

8. **No event:** Deselect event — blocking Card *No event selected*; table and *Book on behalf* absent; no list fetch.
9. **Access denied:** User without `read:page.bookings` sees `AccessDenied`.
10. **Transient Supabase client:** Until secure client ready, centred loading spinner (no error toast).

## Errors

11. Simulate list fetch failure — destructive `Alert` with normalised message and **Retry** refetches.

## Permission-conditional UI

12. Without `create:page.bookings`: *Book on behalf* hidden.
13. Without `update:page.bookings`: **Promote** hidden on waitlisted rows.
14. Without `delete:page.bookings`: **Cancel** hidden on confirmable rows.

## Mutations (requires RPCs on dev-db)

_Block until `app_base_activity_booking_create` and `app_base_activity_booking_cancel` are deployed._

15. **Book on behalf:** Approved applications only in Participant select; sessions grouped by offering; non-override path calls create RPC without override fields; success toast *Booking created*.
16. **Override path:** With any override checkbox, Override dialog opens first; confirm disabled until non-empty reason; success *Booking created with override*.
17. **Cancel:** Dialog copy and confirm; cancel RPC with `source = admin`; success *Booking cancelled*; row updates.
18. **Already cancelled race:** After another session cancels same booking, confirming cancel yields destructive toast *This booking has already been cancelled.* and list refresh.
19. **Promote (capacity available):** Confirm dialog; create RPC with `p_promote_from_waitlist` true; success *Participant promoted to confirmed*.
20. **Promote (at capacity):** Override dialog *Override capacity and promote*; *Promote with override* after reason; RPC with capacity override flags.
21. **Override audit:** After override-path success, row shows `override_reason` / `override_by`; `override_at` set server-side (not from client).

## Automated coverage

- Unit: `src/features/bookingOversight/shared.test.ts`, `configuration.test.ts`.
- Page: `src/pages/activities/BookingsPage.test.tsx`.
- Route: `src/app.test.tsx` (bookings path).
