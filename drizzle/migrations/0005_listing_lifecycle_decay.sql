-- Listing freshness lifecycle: decay -> warn -> delist, with per-market rules.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS last_confirmed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lifecycle_state text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS warned_at timestamptz,
  ADD COLUMN IF NOT EXISTS delisted_at timestamptz;

UPDATE public.listings SET last_confirmed_at = created_at WHERE last_confirmed_at > created_at;

CREATE TABLE IF NOT EXISTS public.listing_lifecycle_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  house_type text,
  source text,
  priority integer NOT NULL DEFAULT 0,
  warn_after_days integer NOT NULL DEFAULT 10,
  grace_days integer NOT NULL DEFAULT 4,
  decay_half_life_days numeric NOT NULL DEFAULT 14,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.listing_lifecycle_rules TO anon;
GRANT SELECT ON public.listing_lifecycle_rules TO authenticated;
GRANT ALL ON public.listing_lifecycle_rules TO service_role;

ALTER TABLE public.listing_lifecycle_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active lifecycle rules" ON public.listing_lifecycle_rules;
CREATE POLICY "Anyone can read active lifecycle rules"
  ON public.listing_lifecycle_rules FOR SELECT
  TO anon, authenticated
  USING (active);

DROP TRIGGER IF EXISTS listing_lifecycle_rules_updated_at ON public.listing_lifecycle_rules;
CREATE TRIGGER listing_lifecycle_rules_updated_at
  BEFORE UPDATE ON public.listing_lifecycle_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.listing_lifecycle_rules (name, priority, warn_after_days, grace_days, decay_half_life_days)
SELECT 'Global default', 0, 10, 4, 14
WHERE NOT EXISTS (
  SELECT 1 FROM public.listing_lifecycle_rules
  WHERE city IS NULL AND house_type IS NULL AND source IS NULL
);

CREATE INDEX IF NOT EXISTS listings_lifecycle_idx
  ON public.listings (lifecycle_state, last_confirmed_at);

-- Best matching rule for a listing's market/segment: most specific wins.
CREATE OR REPLACE FUNCTION public.resolve_lifecycle_rule(_city text, _house_type text, _source text)
RETURNS public.listing_lifecycle_rules
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT r.*
  FROM public.listing_lifecycle_rules r
  WHERE r.active
    AND (r.city IS NULL OR r.city = _city)
    AND (r.house_type IS NULL OR r.house_type = _house_type)
    AND (r.source IS NULL OR r.source = _source)
  ORDER BY
    (r.city IS NOT NULL)::int + (r.house_type IS NOT NULL)::int + (r.source IS NOT NULL)::int DESC,
    r.priority DESC,
    r.created_at ASC
  LIMIT 1
$$;

-- Any meaningful owner edit counts as a freshness confirmation.
CREATE OR REPLACE FUNCTION public.refresh_listing_freshness_on_edit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.rent IS DISTINCT FROM OLD.rent
     OR NEW.deposit IS DISTINCT FROM OLD.deposit
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.availability_status IS DISTINCT FROM OLD.availability_status
     OR NEW.available_from IS DISTINCT FROM OLD.available_from
     OR NEW.available_from_date IS DISTINCT FROM OLD.available_from_date
     OR NEW.photos IS DISTINCT FROM OLD.photos THEN
    NEW.last_confirmed_at := now();
    NEW.lifecycle_state := 'active';
    NEW.warned_at := NULL;
    NEW.delisted_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_refresh_freshness ON public.listings;
CREATE TRIGGER listings_refresh_freshness
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.refresh_listing_freshness_on_edit();

-- Owner action: confirm the home is still available (also relists a delisted home).
CREATE OR REPLACE FUNCTION public.confirm_listing_freshness(_listing_id uuid, _actor uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _updated uuid;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Sign in to manage your listing';
  END IF;

  UPDATE public.listings
     SET last_confirmed_at = now(),
         lifecycle_state = 'active',
         warned_at = NULL,
         delisted_at = NULL,
         status = 'published',
         map_visible = true
   WHERE id = _listing_id
     AND owner_id = _actor
  RETURNING id INTO _updated;

  IF _updated IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_listing_freshness(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_listing_freshness(uuid, uuid) TO service_role;

-- Daily sweep: warn stale listings, delist the ones whose grace window ran out.
CREATE OR REPLACE FUNCTION public.run_listing_lifecycle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row record;
  _rule public.listing_lifecycle_rules;
BEGIN
  FOR _row IN
    SELECT id, owner_id, title, area, city, house_type, source, lifecycle_state,
           last_confirmed_at, warned_at
    FROM public.listings
    WHERE status = 'published'
      AND lifecycle_state IN ('active', 'warned')
      AND owner_id IS NOT NULL
  LOOP
    _rule := public.resolve_lifecycle_rule(_row.city, _row.house_type, _row.source);
    IF _rule.id IS NULL THEN
      CONTINUE;
    END IF;

    IF _row.lifecycle_state = 'active'
       AND _row.last_confirmed_at < now() - make_interval(days => _rule.warn_after_days) THEN
      UPDATE public.listings
         SET lifecycle_state = 'warned', warned_at = now()
       WHERE id = _row.id;

      INSERT INTO public.notifications (user_id, listing_id, kind, title, body)
      VALUES (
        _row.owner_id,
        _row.id,
        'lifecycle',
        'This property will be delisted unless you take action.',
        _row.title || ' in ' || _row.area || ' has not been confirmed for ' ||
        _rule.warn_after_days || ' days. Tap "Still available" to keep it live — otherwise it comes down in ' ||
        _rule.grace_days || ' days.'
      );

    ELSIF _row.lifecycle_state = 'warned'
       AND _row.warned_at IS NOT NULL
       AND _row.warned_at < now() - make_interval(days => _rule.grace_days) THEN
      UPDATE public.listings
         SET lifecycle_state = 'delisted',
             delisted_at = now(),
             status = 'delisted',
             map_visible = false
       WHERE id = _row.id;

      INSERT INTO public.notifications (user_id, listing_id, kind, title, body)
      VALUES (
        _row.owner_id,
        _row.id,
        'lifecycle',
        'Your listing has been delisted',
        _row.title || ' in ' || _row.area || ' is no longer shown to tenants. Relist it any time from your profile.'
      );
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.run_listing_lifecycle() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_listing_lifecycle() TO service_role;
