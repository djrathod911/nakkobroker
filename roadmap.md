# Optional phone verification launch
- [x] Remove unavailable SMS actions, preserve email-code signup, and keep contact numbers honestly labelled.
- [x] Reject all four SMS endpoints before privileged access; 51 tests pass, signup validation and signed-in publication/readback verified, temporary listing removed and original cloud draft restored.
- [x] Find and fix missing signup-email token; 52 tests pass. Verify actual returning-user code delivery/sign-in for the fresh account, publish/read back an unverified-contact listing with zero SMS requests, and remove the listing.
- [ ] Verify fresh signup code delivery after publishing: managed emails still use the live signup template; current emails contain only a link. Fresh account confirmed through its delivered link; subsequent email-code sign-in passed.
- [ ] Remove the two controlled auth accounts through More → Users: no supported account-deletion tool is available; temporary listings and drafts are removed.

# Listing section completion
- [x] Mark sections complete only when their own details are valid and entered or explicitly confirmed; preserve status in saved drafts.
- [x] Test untouched pricing, partial entry, completed sections, invalid edits and restored drafts; signed-in checks and all 44 tests pass.

# Listing location consistency
- [x] Keep selected locality and coordinates together in owner and shared listing flows, including saved drafts and reused properties.
- [x] Test Boduppal, pin changes, validation and signed-in saved-draft readback; correct the reported listing and verify its detail page.
- [ ] Verify live Google Places selection on the deployed site: Maps-dependent calls are unavailable in agent testing.

# Shared accommodation
- [x] Extend storage with explicit categories, property links, contribution pricing, private total rent, preferences and permission declarations.
- [x] Add category selection and tenant/room listing, draft, preview and edit flows.
- [x] Integrate shared discovery, filters, cards, detail, existing enquiries and availability management.
- [x] Test financial rules, anonymous access controls, persistence, all accommodation publication types and desktop/phone flows; remove controlled listings, property groups and photos.
- [ ] Verify a new shared-room enquiry between two signed-in accounts: requires an approved second-account session.

# Satellite zoom
- [x] Fix unsupported satellite tile requests; deep zoom, wheel zoom and mode switching verified; publishing requested.

# Mobile city pages
- [x] Fit city pages and their map, filters, and listing cards to phones.
- [x] Fit visit requests and tour calendars to phone screens without changing booking rules.
- [x] Verify all five cities at 320px, phone filters, and map/list switching; regression tests pass.
- [x] Verify tour booking and cancellation using controlled temporary listings.
- [ ] Verify a real viewing-request submission: awaits an appropriate real listing; outside the controlled tour-booking checks.

# Controlled booking security checks
- [x] Verify published bookings, hidden-home rejection, and blocked direct booking writes.
- [x] Verify tenant and owner visibility and cancellation.
- [x] Remove temporary listings, slots, bookings, generated notifications, accounts, and local sessions; all database counts are zero.