-- 1) Force server-controlled trust fields on listings
CREATE OR REPLACE FUNCTION public.enforce_listing_trust_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.community_verified := false;
    NEW.suspicious_price := false;
    NEW.votes := 0;
  ELSE
    NEW.community_verified := OLD.community_verified;
    NEW.suspicious_price := OLD.suspicious_price;
    NEW.votes := OLD.votes;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_listing_trust_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS listings_enforce_trust_fields ON public.listings;
CREATE TRIGGER listings_enforce_trust_fields
BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_trust_fields();

-- keep vote-sync trigger able to write votes (runs as definer/owner)
CREATE OR REPLACE FUNCTION public.sync_listing_votes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.listings SET votes = votes + 1 WHERE id = NEW.listing_id;
    RETURN NEW;
  ELSE
    UPDATE public.listings SET votes = GREATEST(votes - 1, 0) WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
END; $$;

-- allow the vote-sync path to bypass the trust-field lock
CREATE OR REPLACE FUNCTION public.enforce_listing_trust_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('app.vote_sync', true) = 'on'
     OR current_setting('role', true) = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.community_verified := false;
    NEW.suspicious_price := false;
    NEW.votes := 0;
  ELSE
    NEW.community_verified := OLD.community_verified;
    NEW.suspicious_price := OLD.suspicious_price;
    NEW.votes := OLD.votes;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_listing_votes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('app.vote_sync', 'on', true);
  IF TG_OP = 'INSERT' THEN
    UPDATE public.listings SET votes = votes + 1 WHERE id = NEW.listing_id;
    PERFORM set_config('app.vote_sync', 'off', true);
    RETURN NEW;
  ELSE
    UPDATE public.listings SET votes = GREATEST(votes - 1, 0) WHERE id = OLD.listing_id;
    PERFORM set_config('app.vote_sync', 'off', true);
    RETURN OLD;
  END IF;
END; $$;

-- also block direct column writes from clients
REVOKE INSERT (community_verified, suspicious_price, votes) ON public.listings FROM anon, authenticated;
REVOKE UPDATE (community_verified, suspicious_price, votes) ON public.listings FROM anon, authenticated;

-- 2) Lock down SECURITY DEFINER functions not meant for clients
REVOKE ALL ON FUNCTION public.send_daily_alert_digests() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_in_phone(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_matching_alerts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_listing_owner_verified() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_listing_votes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- keep the gated phone reveal callable by signed-in users only
REVOKE ALL ON FUNCTION public.get_listing_contact_phone(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_listing_contact_phone(uuid) TO authenticated;