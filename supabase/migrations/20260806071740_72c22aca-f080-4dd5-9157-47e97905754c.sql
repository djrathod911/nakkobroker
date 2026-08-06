-- 1. listings.contact_phone: remove direct column access from clients
REVOKE SELECT (contact_phone) ON public.listings FROM anon;
REVOKE SELECT (contact_phone) ON public.listings FROM authenticated;
REVOKE INSERT (contact_phone), UPDATE (contact_phone) ON public.listings FROM anon;

CREATE OR REPLACE FUNCTION public.get_listing_contact_phone(_listing_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.contact_phone
  FROM public.listings l
  WHERE l.id = _listing_id
    AND auth.uid() IS NOT NULL
    AND (l.status = 'published' OR l.owner_id = auth.uid())
$$;

REVOKE ALL ON FUNCTION public.get_listing_contact_phone(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_listing_contact_phone(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_listing_contact_phone(uuid) TO authenticated;

-- 2. listing_votes: stop exposing voter identities publicly
DROP POLICY IF EXISTS "Votes are viewable by everyone" ON public.listing_votes;
CREATE POLICY "Users can view their own votes"
  ON public.listing_votes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
REVOKE ALL ON public.listing_votes FROM anon;

-- 3. phone_otps: server-only, explicit deny for clients
REVOKE ALL ON public.phone_otps FROM anon;
REVOKE ALL ON public.phone_otps FROM authenticated;
GRANT ALL ON public.phone_otps TO service_role;
DROP POLICY IF EXISTS "No client access to phone_otps" ON public.phone_otps;
CREATE POLICY "No client access to phone_otps"
  ON public.phone_otps FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
COMMENT ON TABLE public.phone_otps IS 'Server-only OTP store. Accessed exclusively via service_role in server functions; all client access is denied by policy and revoked grants.';