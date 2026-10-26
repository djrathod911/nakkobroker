<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- City rental pages reuse the shared listing query, filters, listing cards, and MapLibre renderer; this keeps discovery consistent without duplicating city data or booking logic.
- CI runs only the Bun workflow (`.github/workflows/deno.yml`: install, lint, build); the app is Vite-based, so webpack/Node-matrix templates must not be re-added. Prettier issues are warnings so formatting drift never fails CI.
- Shared satellite style caps native imagery requests and lets MapLibre overzoom cached imagery, avoiding provider placeholder tiles at unsupported detail levels.
- Shared accommodation retains listings as offer identities for existing messaging, with creator-scoped property groups and separate private finance; this preserves enquiries and prevents private rent disclosure.
- Home, city and shared-room discovery use one filter predicate; price always represents the advertised offer, and only occupied shared-room/bed offers require an explicit availability filter so whole-flat advance listings remain discoverable.
- Shared listing drafts persist as creator-owned draft offers, including uploaded photo paths, and editing preserves the offer ID rather than duplicating it.
- Address selection updates locality and coordinates atomically in every listing journey; pin moves require fresh locality confirmation, and reused properties carry their coordinates, preventing stale locality labels from being published.
- Owner section completion requires valid values plus entered-field or explicit section-confirmation metadata stored in the draft; defaults and navigation alone never complete a section.
- A shared launch policy disables all SMS request and verification endpoints before privileged imports or OTP writes; email signup and valid listing contacts stay independent of phone-verification badges, preventing charges and false verification.
- Pass the Cloud-issued token to both signup and magic-link email templates because passwordless creation and returning-user sign-in dispatch different email actions.
