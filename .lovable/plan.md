# Tenant Dashboard

A single signed-in page at `/dashboard` with three sections: saved homes, conversations with owners, and alerts for new homes in budget.

## Saved homes

There is currently no way for a tenant to save a home, so this adds one:

- A heart button on each home card and on the home detail page.
- Tapping it saves or unsaves instantly; unsigned visitors see a "Sign in to save" prompt.
- The dashboard lists saved homes as cards with photo, rent, area, and a link to the full page, plus an empty state that points to the map.

## Messages

- Lists existing conversations with the owner's name, the last message preview, time, and an unread badge.
- Tapping a row opens the existing conversation page.
- Empty state links to browsing homes.

## Alerts

- Shows each saved alert (budget, size, furnishing, area filters) with edit and delete.
- Shows recent matching-home notifications, newest first, each linking to the home.
- Lets a tenant create a new alert from the dashboard using the existing alert form.

## Navigation

- Header shows a "Dashboard" link when signed in.
- Reuses existing dark styling and skeleton loaders.

## Technical notes

- New table `public.saved_listings` (user_id, listing_id, created_at, unique pair), with GRANTs for `authenticated`/`service_role`, RLS enabled, and policies scoped to `auth.uid()`.
- Route `src/routes/_authenticated/dashboard.tsx` under the existing auth gate; data fetched through `createServerFn` handlers with `requireSupabaseAuth`, consumed via React Query.
- Reuses existing `conversations`/`messages`, `saved_alerts`, and `notifications` tables and the existing `SaveAlertPanel` component.
- Head metadata set on the new route.

## Credits

Exact cost can't be predicted. Plan mode costs 1 credit per message; build mode is usage-based and depends on scope, iterations, and follow-up fixes — a feature this size is typically several build messages.
