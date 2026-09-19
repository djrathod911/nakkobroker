# Keep listings fresh: automatic decay, reminder, and delisting

Homes that nobody confirms slowly lose visibility, the owner gets a warning, and the home is taken down if there is still no response. One tap by the owner puts it back to full visibility.

## How it works for people

**Owner**
- Every home has a "last confirmed" date, set when it is posted and refreshed on any real edit.
- After the configured window (10 days by default) they get an alert in the bell and on their dashboard: "This property will be delisted unless you take action."
- The home card in the dashboard shows a clear banner with two buttons: **Still available** (resets everything) and **Mark as rented out**.
- If nothing happens within the grace window (4 days by default), the home is delisted: it disappears from search and the map but stays in their dashboard, relistable with one tap.

**Tenant**
- Fresher homes rank higher in the results list; homes drifting toward stale sink gradually rather than vanishing suddenly.
- Homes past the warning point carry a small "Not recently confirmed" note so tenants know what they are looking at.

**Configurability**
- Rules are stored per market/segment, not hardcoded: a rule can target a city, a property type (Flat/Villa/PG), a source (Owner / To-Let board), or any combination, and sets the warning days, grace days, and how fast relevance decays. The most specific matching rule wins, with a global default as the fallback.

## Technical plan

### Migration (via the database migration tool)

`public.listings` new columns:
- `last_confirmed_at timestamptz not null default now()` (backfilled from `created_at`)
- `lifecycle_state text not null default 'active'` — `active` | `warned` | `delisted`
- `warned_at timestamptz`, `delisted_at timestamptz`

`public.listing_lifecycle_rules` (new, admin/service-managed):
- `id`, `name`, `city text`, `house_type text`, `source text`, `priority int` (all scope columns nullable = wildcard)
- `warn_after_days int default 10`, `grace_days int default 4`, `decay_half_life_days numeric default 14`, `active boolean default true`
- GRANTs: `SELECT` to `anon, authenticated` (needed for client-side ranking), `ALL` to `service_role`; RLS on, read-only policy for everyone, writes service-role only.
- Seed one global default row (10 / 4 / 14).

Functions:
- `public.resolve_lifecycle_rule(_city, _house_type, _source)` — stable, returns the best-matching rule row by specificity then priority.
- `public.run_listing_lifecycle()` — security definer: marks `active` listings past `warn_after_days` as `warned` (sets `warned_at`, inserts a `notifications` row with kind `lifecycle` and the exact warning copy), and marks `warned` listings past `grace_days` as `delisted` (`status = 'delisted'`, `map_visible = false`, notification "Your listing has been delisted"). Idempotent.
- `public.confirm_listing_freshness(_listing_id, _actor)` — security definer, verifies `owner_id = _actor`: resets `last_confirmed_at = now()`, `lifecycle_state = 'active'`, clears `warned_at`/`delisted_at`, restores `status = 'published'` and `map_visible`.
- Trigger on `listings` UPDATE: any change to rent/availability/description/photos refreshes `last_confirmed_at` and clears the warning.

Schedule: one `pg_cron` job, daily at 03:00 UTC, calling `run_listing_lifecycle()`. Daily is the least frequent cadence that still honours a day-based threshold; a listing can therefore be at most ~24h late in being warned or delisted. No other polling job is added.

### App code

- `src/lib/lifecycle.functions.ts` — authenticated server fn `confirmListingFreshnessFn` (mirrors the `tours.functions.ts` pattern: `requireSupabaseAuth`, `supabaseAdmin.rpc('confirm_listing_freshness', { _listing_id, _actor: context.userId })`); the RPC is not callable by `authenticated` directly.
- `src/lib/listings.api.ts` — add `last_confirmed_at`, `lifecycle_state` to `PUBLIC_COLUMNS`, `DbListingRow`, and `Listing` (`lastConfirmedAt`, `lifecycleState`); `fetchListings` filters `status = 'published'`; add `fetchLifecycleRules()` and `confirmListingFreshness(id)`; extend `fetchMyListings` with the lifecycle columns.
- `src/lib/relevance.ts` (new) — `freshnessScore(listing, rule)` = `0.5 ^ (daysSinceConfirmed / halfLife)`, and `rankListings(listings, rules)` combining it with the existing sort so fresh homes surface first.
- `src/routes/index.tsx` — apply `rankListings` to the results list; show a muted "Not recently confirmed" line on cards whose `lifecycleState === 'warned'`.
- `src/components/listings/ListingCard.tsx` and `src/routes/listing.$id.tsx` — render that same note.
- `src/routes/_authenticated/dashboard.tsx` (My listings area) — warning banner per affected home with **Still available** (calls the server fn, invalidates `["my-listings"]`) and **Mark as rented out**; delisted homes show a **Relist** button using the same call.
- Notifications flow through the existing bell unchanged (kind `lifecycle` renders like an instant match).

### Verification
- `bunx tsgo --noEmit`, `bun run test:e2e`, build log clean.
- Backdate a temporary test listing to exercise warn → delist → confirm, then remove it so the beta slate stays empty.
