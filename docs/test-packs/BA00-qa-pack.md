# BA00 QA Pack

## Slice metadata

- slice_id: BA00
- app: pace-base2
- requirement_path: docs/requirements/BA00-app-shell-and-access-requirements.md

## Manual frontend scenarios

| scenario_id | requirement_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|---|
| S-01 | AC-01 | /login | an unauthenticated user | 1) Open `/login`. 2) navigate to /. 3) Observe the resulting UI/system response. | they are redirected to /login | Pass | - |
| S-02 | AC-02 | /some-other-route | an unauthenticated user | 1) Open `/some-other-route`. 2) navigate to /some-other-route. 3) Observe the resulting UI/system response. | they are redirected to /login | Pass | - |
| S-03 | AC-03 | /login | an unauthenticated user | 1) Open `/login`. 2) enter invalid credentials on /login and click "Sign in". 3) Observe the resulting UI/system response. | an inline error alert appears and they remain on /login | Pass | - |
| S-04 | AC-04 | /event-dashboard | an unauthenticated user | 1) Open `/event-dashboard`. 2) enter valid credentials and click "Sign in". 3) Observe the resulting UI/system response. | they are redirected to /event-dashboard | Pass | - |
| S-05 | AC-05 | /event-dashboard | an authenticated user | 1) Open `/event-dashboard`. 2) navigate to /. 3) Observe the resulting UI/system response. | they are redirected to /event-dashboard | Pass | - |
| S-06 | AC-06 | /does-not-exist | an authenticated user | 1) Open `/does-not-exist`. 2) navigate to an unrecognised URL (e.g. /does-not-exist). 3) Observe the resulting UI/system response. | the 404 page is shown inside the shell | Pass | - |
| S-07 | AC-07 | /event-dashboard | an authenticated user on the 404 page | 1) Open `/event-dashboard`. 2) click "Return to Event Dashboard". 3) Observe the resulting UI/system response. | they are navigated to /event-dashboard via client-side routing (no full page reload) | Pass | - |
| S-08 | AC-08 | /login | an authenticated user | 1) Open `/login`. 2) click "Sign out" in the user menu. 3) Observe the resulting UI/system response. | they are signed out and redirected to /login | Pass | - |
| S-09 | AC-09 | /event-dashboard | an authenticated user | 1) Open `/event-dashboard`. 2) open the change-password modal and submit passwords that don't match. 3) Observe the resulting UI/system response. | a validation error is shown and no network request is made | Pass | - |
| S-10 | AC-10 | /event-dashboard | an authenticated user | 1) Open `/event-dashboard`. 2) open the change-password modal and submit a new password shorter than 8 characters. 3) Observe the resulting UI/system response. | a validation error is shown and no network request is made | Pass | - |
| S-11 | AC-11 | /event-dashboard | an authenticated user | 1) Open `/event-dashboard`. 2) open the change-password modal and submit a valid matching password pair. 3) Observe the resulting UI/system response. | the modal closes on success | Pass | - |
| S-12 | AC-12 | /event-dashboard | an authenticated user who has been idle for 25 minutes | 1) Open `/event-dashboard`. 2) The inactivity modal appears and they click "Stay signed in". 3) Observe the resulting UI/system response. | the modal closes and the idle timer resets | Pass | - |
| S-13 | AC-13 | /login | an authenticated user who has been idle for 25 minutes | 1) Open `/login`. 2) The inactivity modal appears and they click "Sign out now". 3) Observe the resulting UI/system response. | they are signed out and redirected to /login | Pass | - |
| S-14 | AC-14 | /event-dashboard | the app loading with a stored session | 1) Open `/event-dashboard`. 2) Session restoration is in progress. 3) Observe the resulting UI/system response. | a full-screen spinner with "Restoring session…" is shown and no other content is visible | Pass | - |
| S-15 | AC-15 | /event-dashboard | an authenticated user whose nav item lacks a matching read permission in RBAC | 1) Open `/event-dashboard`. 2) view the navigation. 3) Observe the resulting UI/system response. | that nav item is not visible | Pass | - |

## Test run summary

- overall result: Pass
- pass count: 15
- fail count: 0
- untested count (still marked Pass/Fail): 0
- failed scenarios: -
- defect links: N/A
- retest needed: No
