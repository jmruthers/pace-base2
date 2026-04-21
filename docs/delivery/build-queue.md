# BASE Build Queue (Post Phase 4 Freeze)

## Queue policy

- Execute slices sequentially in architecture dependency order.
- A slice may start only if:
  - all dependencies are `Built` (or explicitly satisfied by policy),
  - backend-ready gate evidence exists for that slice,
  - no unresolved blocker is open.
- Backend delta readiness source: `docs/delivery/backend-delta-backlog.md` (`BD-001`..`BD-015` resolved, `BD-016` deferred).

## Queue entries

| Order | Slice | Depends on | Preflight status | Execution status | Next action |
| --- | --- | --- | --- | --- | --- |
| 1 | BA00 | None | Ready (dependency clear + backend gate passed) | Not started | Execute BA00 as first build-queue slice. |
| 2 | BA01 | BA00 | Blocked (dependency: BA00 not Built) | Not started | Validate backend event/config contracts and clear BA01 readiness blockers. |
| 3 | BA02 | None | Ready (dependency clear + backend gate passed) | Not started | Complete Phase 2 backend aggregation and upstream CR21-aligned contract implementation. |
| 4 | BA03 | BA00, BA01, BA02 | Blocked (dependencies not Built) | Not started | Complete BA02 contract readiness and then run BA03 route-level implementation. |
| 5 | BA04 | BA01, BA02, BA03 | Blocked (dependencies not Built) | Not started | Clear BA04 backend deltas and dependency readiness from BA01-BA03. |
| 6 | BA05a | BA02, BA03, BA04 | Blocked (dependencies not Built) | Not started | Complete BA05a backend deltas and confirm portal/BASE ownership contract. |
| 7 | BA05b | BA05a | Blocked (dependency: BA05a not Built) | Not started | Finalize BA05a + progress projection backend contract. |
| 8 | BA06 | BA04, BA05a | Blocked (dependencies not Built) | Not started | Complete backend review/override contract readiness. |
| 9 | BA07 | BA04, BA05a | Blocked (dependencies not Built) | Not started | Finalize BA07 token lifecycle backend contracts and portal integration boundary. |
| 10 | BA08 | BA06 | Blocked (dependency: BA06 not Built) | Not started | Verify preference and access contracts, then execute BA08. |
| 11 | BA09 | BA01 | Blocked (dependency: BA01 not Built) | Not started | Complete BA09 backend setup contracts and confirm BA01 dependency readiness. |
| 12 | BA10 | BA02, BA05a, BA08, BA09 | Blocked (dependencies not Built) | Not started | Finish BA10 backend booking contracts and downstream projection readiness. |
| 13 | BA11 | BA09, BA10 | Blocked (dependencies not Built) | Not started | Clear BA11 backend projection/action readiness and dependency gating. |
| 14 | BA12 | BA01, BA09 | Blocked (dependencies not Built) | Not started | Confirm BA12 setup and manifest backend contracts. |
| 15 | BA13 | BA06, BA11, BA12 | Blocked (dependencies not Built) | Not started | Finalize BA13 validation and runtime submission contracts. |
| 16 | BA14 | BA12, BA13 | Blocked (dependencies not Built) | Not started | Finalize BA14 sync/idempotency contracts and testability evidence. |
| 17 | BA16 | BA08, BA11, BA12, BA13, BA14 | Blocked (dependencies not Built) | Not started | Verify tracking projection contract and upstream slice readiness. |
| 18 | BA15 | BA06, BA08, BA11, BA14 | Deferred (CR22/BD-016 deferred) | Not started | Complete CR22 and backend reporting readiness, then reclassify BA15 to Blocked/Ready. |

## Current queue summary

- Ready: 2 (`BA00`, `BA02`)
- Blocked: 15
- Deferred: 1 (`BA15`)

## Resume protocol

If execution is interrupted:

1. Read this queue and latest build report in `docs/delivery/reports/`.
2. Resume from first non-terminal slice in order whose preflight checks pass.
3. Update this queue row immediately after each slice attempt.
