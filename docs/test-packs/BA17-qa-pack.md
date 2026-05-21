# BA17 QA Pack

## Slice metadata

- slice_id: BA17
- app: pace-base2
- requirement_path: docs/requirements/BA17-communications-and-system-notifications-requirements.md

## Manual frontend scenarios

| scenario_ref | route_or_screen | preconditions | test_steps | expected_result | result | notes |
|---|---|---|---|---|---|---|
| S-01 / AC-01 | /communications | a user with update:page.communications and an active event | 1) Open `/communications`. 2) navigate to /communications and CommComposer loads. 3) Observe the resulting UI/system response. | the compose surface is visible with the filter bar, channel selector, and all composer fields | Pass/Fail | - |
| S-02 / AC-02 | /communications | AC-01 | 1) Open `/communications`. 2) The user selects a channel, enters sender details, types a body without merge tokens, and clicks "Send now". 3) Observe the resulting UI/system response. | a toast appears "Message sent to N participants" and the draft resets | Pass/Fail | - |
| S-03 / AC-03 | /communications | AC-01 | 1) Open `/communications`. 2) The user activates status filter "Approved" only and the pool estimate updates. 3) Observe the resulting UI/system response. | the RecipientPoolPreview shows a count reflecting only approved participants | Pass/Fail | - |
| S-04 / AC-04 | /communications | a user with update:page.communications | 1) Open `/communications`. 2) complete a valid draft and click "Schedule". 3) Observe the resulting UI/system response. | a datetime picker appears and, after selecting a future time and confirming, a toast shows "Message scheduled for [datetime]." | Pass/Fail | - |
| S-05 / AC-05 | /communications | a user with update:page.communications and a draft with channel "Email" | 1) Open `/communications`. 2) click "Send test". 3) Observe the resulting UI/system response. | a toast shows "Test email sent to your email address." | Pass/Fail | - |
| S-06 / AC-06 | /communications | a BA05a Edge Function that issues a guardian check | 1) Open `/communications`. 2) SendSystemNotification is called with BASE_SYSTEM_KEYS.GUARDIAN_REQUEST_ISSUED and a canonical_parent_contact recipient. 3) Observe the resulting UI/system response. | PUMP dispatches an email to the canonical parent contact and the Edge Function continues without error | Pass/Fail | - |
| S-07 / AC-07 | /communications | a BA05a Edge Function that issues a guardian check | 1) Open `/communications`. 2) SendSystemNotification returns an error result. 3) Observe the resulting UI/system response. | the check issuance completes successfully and the error is logged but not surfaced to the operator | Pass/Fail | - |
| S-08 / AC-08 | /communications | a user composing an email with body containing {{unknown_token}} where "unknown_token" is not in the merge field list | 1) Open `/communications`. 2) attempt to click "Send now". 3) Observe the resulting UI/system response. | the button is disabled and the alert banner "Resolve all tokens before sending" is visible | Pass/Fail | - |
| S-09 / AC-09 | /communications | a user who clears the sender name field | 1) Open `/communications`. 2) CommComposer validates the draft. 3) Observe the resulting UI/system response. | the "Send now" button is disabled until a sender name is entered | Pass/Fail | - |
| S-10 / AC-10 | /communications | a user without read:page.communications | 1) Open `/communications`. 2) navigate to /communications. 3) Observe the resulting UI/system response. | the AccessDenied component is displayed and no compose surface or filter bar is rendered | Pass/Fail | - |
| S-11 / AC-11 | /communications | a user with read:page.communications and create:page.communications but not update:page.communications | 1) Open `/communications`. 2) view /communications. 3) Observe the resulting UI/system response. | the CommComposer is editable but the Send now, Schedule, and Send test buttons are not visible | Pass/Fail | - |
| S-12 / AC-12 | /communications | a user with read:page.communications but no active event in context | 1) Open `/communications`. 2) navigate to /communications. 3) Observe the resulting UI/system response. | no compose surface is rendered and the text "Select an event to compose a communication." is shown | Pass/Fail | - |
| S-13 / AC-13 | /communications | a user who applies filters that match no participants, then the RecipientPoolPreview shows "No matching participants — adjust your filters to include recipients." and the "Send now" button remains accessible | 1) Open `/communications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | the RecipientPoolPreview shows "No matching participants — adjust your filters to include recipients." and the "Send now" button remains accessible | Pass/Fail | - |
| S-14 / AC-14 | /communications | adapter.resolvePool returns an error, then the RecipientPoolPreview shows "Could not estimate recipient count. Try again." with a "Try again" link | 1) Open `/communications`. 2) Perform the interaction described by this scenario. 3) Observe the resulting UI/system response. | the RecipientPoolPreview shows "Could not estimate recipient count. Try again." with a "Try again" link | Pass/Fail | - |
| S-15 / AC-15 | /communications | a user who selects Registration type = [Type A] and Status = [approved] | 1) Open `/communications`. 2) The pool preview updates. 3) Observe the resulting UI/system response. | the estimated count reflects only participants in Type A with approved status | Pass/Fail | - |
| S-16 / AC-16 | /communications | a user with at least one active filter (e.g. Status = Approved) | 1) Open `/communications`. 2) click "Clear filters". 3) Observe the resulting UI/system response. | all three MultiSelect dropdowns reset to empty, the "Clear filters" link disappears, and the pool preview re-fetches with no filter constraints | Pass/Fail | - |
| S-17 / AC-17 | /communications | a user with update:page.communications and an active event | 1) Open `/communications`. 2) select channel "SMS", enter sender name, sender phone, and a plain text body without merge tokens, and click "Send now". 3) Observe the resulting UI/system response. | a toast (success variant) shows "Message sent to N participants" and the draft resets | Pass/Fail | - |
| S-18 / AC-18 | /communications | a user composing a message with active filters and a partial draft | 1) Open `/communications`. 2) The event context changes via the BA00 event picker. 3) Observe the resulting UI/system response. | the draft resets to { channel: 'email' }, all three filter dropdowns clear, and the pool preview re-fetches for the new event | Pass/Fail | - |

## Test run summary

- overall result: [Pass | Fail]
- failed scenarios: -
- defect links: N/A
- retest needed: [Yes/No]
