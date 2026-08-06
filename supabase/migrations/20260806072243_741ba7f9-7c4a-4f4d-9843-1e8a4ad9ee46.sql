-- LISTINGS: replace catch-all public policy with explicit per-role policies
DROP POLICY IF EXISTS "Published listings are public" ON public.listings;

CREATE POLICY "Anon can read published listings"
  ON public.listings FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY "Authenticated can read published listings"
  ON public.listings FOR SELECT TO authenticated
  USING (status = 'published');

REVOKE ALL ON public.listings FROM anon;
GRANT SELECT (id, owner_id, title, area, bhk, rent, deposit, maintenance, negotiable,
  furnishing, tenant, owner_verified, community_verified, suspicious_price, metro_km,
  it_corridor_km, sqft, available_from, amenities, photos, lng, lat, source, status,
  votes, created_at, updated_at) ON public.listings TO anon;

-- PROFILES: no anonymous access
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- LISTING VOTES: deny-by-default for anon, block updates explicitly
REVOKE ALL ON public.listing_votes FROM anon;
GRANT SELECT, INSERT, DELETE ON public.listing_votes TO authenticated;
GRANT ALL ON public.listing_votes TO service_role;

DROP POLICY IF EXISTS "No vote updates" ON public.listing_votes;
CREATE POLICY "No vote updates"
  ON public.listing_votes FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

-- SAVED ALERTS / NOTIFICATIONS: owner-only, no anon
REVOKE ALL ON public.saved_alerts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_alerts TO authenticated;
GRANT ALL ON public.saved_alerts TO service_role;

REVOKE ALL ON public.notifications FROM anon;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

DROP POLICY IF EXISTS "No client notification inserts" ON public.notifications;
CREATE POLICY "No client notification inserts"
  ON public.notifications FOR INSERT TO anon, authenticated
  WITH CHECK (false);

-- VERIFIED PHONES: read-own only, no writes from clients
REVOKE ALL ON public.verified_phones FROM anon;
GRANT SELECT ON public.verified_phones TO authenticated;
GRANT ALL ON public.verified_phones TO service_role;

DROP POLICY IF EXISTS "No client writes to verified_phones" ON public.verified_phones;
CREATE POLICY "No client writes to verified_phones"
  ON public.verified_phones FOR ALL TO anon
  USING (false) WITH CHECK (false);

-- PHONE OTPS: server-only
REVOKE ALL ON public.phone_otps FROM anon, authenticated;
GRANT ALL ON public.phone_otps TO service_role;