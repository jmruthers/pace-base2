# BASE Build Queue

## Run Readiness Summary

- backend gate status: PASS
- backend freeze status: YES
- queue generation timestamp: 2026-05-02 12:09:43 AEST
- total slices: 12
- blocked count: 2

| slice_id | depends_on | status | blocker_reason | evidence |
|---|---|---|---|---|
| BA00 | - |  |  | requirement: BA00 metadata `Depends on: None`; backend gate PASS/freeze YES in `pace-core2/docs/delivery/base-backend-ready-report.md` |
| BA02 | - |  |  | requirement: BA02 metadata `Depends on: None`; backend gate PASS/freeze YES in `pace-core2/docs/delivery/base-backend-ready-report.md` |
| BA01 | BA00 |  |  | requirement: BA01 metadata dependency on BA00 |
| BA03 | BA00, BA01, BA02 |  |  | requirement: BA03 metadata dependency on BA00, BA01, BA02 |
| BA18 | BA00, BA01 |  |  | requirement: BA18 metadata dependency on BA00, BA01 |
| BA04 | BA01, BA02, BA03 |  |  | requirement: BA04 metadata dependency on BA01, BA02, BA03 |
| BA05a | BA02, BA03, BA04 |  |  | requirement: BA05a metadata dependency on BA02, BA03, BA04 |
| BA05b | BA05a |  |  | requirement: BA05b metadata dependency on BA05a |
| BA06 | BA04, BA05a |  |  | requirement: BA06 metadata includes BA04 and BA05a; `BA17.contract` dependency treated as backend-evidence satisfied for this run per operator conflict decision and backend-ready report PASS |
| BA07 | BA04, BA05a |  |  | requirement: BA07 metadata dependency on BA04 and BA05a.contract (mapped to BA05a) |
| BA15 | BA06, BA08, BA11, BA14 | Blocked | missing upstream slice contracts outside in-scope queue (`BA08`, `BA11`, `BA14`); owner: upstream BASE slice owners (requirements/backend track) | requirement: BA15 metadata `Depends on: BA06, BA08, BA11, BA14`; this queue is limited to in-scope slices only |
| BA17 | BA01, BA04, BA05a, BA06, BA08 | Blocked | missing upstream slice contract outside in-scope queue (`BA08`); owner: upstream BASE slice owners (requirements/backend track) | requirement: BA17 metadata includes `BA08.contract` (mapped to BA08); this queue is limited to in-scope slices only |
