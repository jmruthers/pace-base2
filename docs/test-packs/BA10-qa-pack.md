# BA10 QA Pack - Participant Booking Contract

## Scope

- Slice: BA10 participant activity booking experience (contract layer only)
- BASE UI routes: none (pace-portal owns participant UI)
- Contract module targets:
  - `src/features/participantBookingExperience/types.ts`
  - `src/features/participantBookingExperience/shared.ts`
  - `src/ba10-participant-booking-contracts.test.ts`

## Contract verification checklist

- [x] Browse projection computes `bookingWindowOpen` for null and bounded windows (`shared.test.ts` booking-window suite).
- [x] Session projection computes `capacityFull` from confirmed-only counts (`shared.test.ts` capacity suite).
- [x] Waitlist projection computes `waitlistOpen` as `capacityFull && allow_waitlist` (`shared.test.ts` waitlist suite).
- [x] Validation projection returns all simultaneous failure-class fields in one response shape (`ba10-participant-booking-contracts.test.ts` multi-failure contract test).
- [x] Duplicate booking flags confirmed/waitlisted as duplicates; cancelled excluded (`shared.test.ts` duplicate suite).
- [x] Session conflict detection flags overlaps and returns `conflictingSession` (`shared.test.ts` conflict suite).
- [x] Adjacent sessions are treated as non-overlapping (`shared.test.ts` overlap boundary test).
- [x] Cancellation projection computes `cancellable` only for confirmed future sessions (`shared.test.ts` cancellable matrix).
- [x] Waitlisted bookings project `onWaitlist: true` and `cancellable: false` (`shared.test.ts` waitlist + cancellable assertions).
- [x] Permission denial maps `base_booking_access_denied` to consumer-access-denied state (`contract.test.ts` + `ba10-participant-booking-contracts.test.ts` denial pathway tests).

## Automated evidence

- Targeted tests:
  - `npm run test -- src/features/participantBookingExperience/shared.test.ts src/features/participantBookingExperience/contract.test.ts src/ba10-participant-booking-contracts.test.ts` (28/28 passing)
- Full quality gate:
  - `npm run validate` (all 6 checks passing)

## Notes

- BA10 remains read-side only in BASE.
- No participant booking pages/routes were added to `src/App.tsx` or `src/config/baseRouteRegistry.ts`.
- No booking create/cancel or consent write client mutations were implemented in this slice.
