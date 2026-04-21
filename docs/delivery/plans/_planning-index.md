# BASE Phase 1 Planning Index

## Scope

This index tracks Phase 1 planning outputs for BASE slices and links each per-slice delivery plan.

## Slice planning tracker

| Slice | Plan file | Depends on | Initial handoff state |
| --- | --- | --- | --- |
| BA00 | `docs/delivery/plans/BA00-plan.md` | None | Ready |
| BA01 | `docs/delivery/plans/BA01-plan.md` | BA00 | Blocked (backend gate) |
| BA02 | `docs/delivery/plans/BA02-plan.md` | None | Blocked (backend gate) |
| BA03 | `docs/delivery/plans/BA03-plan.md` | BA00, BA01, BA02 | Blocked (backend gate) |
| BA04 | `docs/delivery/plans/BA04-plan.md` | BA01, BA02, BA03 | Blocked (backend gate) |
| BA05a | `docs/delivery/plans/BA05a-plan.md` | BA02, BA03, BA04 | Blocked (backend gate) |
| BA05b | `docs/delivery/plans/BA05b-plan.md` | BA05a | Blocked (backend gate) |
| BA06 | `docs/delivery/plans/BA06-plan.md` | BA04, BA05a | Blocked (backend gate) |
| BA07 | `docs/delivery/plans/BA07-plan.md` | BA04, BA05a | Blocked (backend gate) |
| BA08 | `docs/delivery/plans/BA08-plan.md` | BA06 | Blocked (backend gate) |
| BA09 | `docs/delivery/plans/BA09-plan.md` | BA01 | Blocked (backend gate) |
| BA10 | `docs/delivery/plans/BA10-plan.md` | BA02, BA05a, BA08, BA09 | Blocked (backend gate) |
| BA11 | `docs/delivery/plans/BA11-plan.md` | BA09, BA10 | Blocked (backend gate) |
| BA12 | `docs/delivery/plans/BA12-plan.md` | BA01, BA09 | Blocked (backend gate) |
| BA13 | `docs/delivery/plans/BA13-plan.md` | BA06, BA11, BA12 | Blocked (backend gate) |
| BA14 | `docs/delivery/plans/BA14-plan.md` | BA12, BA13 | Blocked (backend gate) |
| BA16 | `docs/delivery/plans/BA16-plan.md` | BA08, BA11, BA12, BA13, BA14 | Blocked (backend gate) |
| BA15 | `docs/delivery/plans/BA15-plan.md` | BA06, BA08, BA11, BA14 | Deferred (CR22 + backend gate) |

## Notes

- Handoff states above are initial recommendations and are finalized in each slice plan.
- Backend-gated slices require Phase 2+4 completion before build queue execution.
