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