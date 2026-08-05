CREATE TABLE public.saved_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My alert',
  bhk integer[] NOT NULL DEFAULT '{}',
  max_rent integer NOT NULL DEFAULT 130000,
  furnishing text[] NOT NULL DEFAULT '{}',
  amenities text[] NOT NULL DEFAULT '{}',
  owner_only boolean NOT NULL DEFAULT false,
  instant boolean NOT NULL DEFAULT true,
  daily_digest boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_alerts TO authenticated;
GRANT ALL ON public.saved_alerts TO service_role;

ALTER TABLE public.saved_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alerts" ON public.saved_alerts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER saved_alerts_updated_at BEFORE UPDATE ON public.saved_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX saved_alerts_user_idx ON public.saved_alerts (user_id);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES public.saved_alerts(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'instant',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.notify_matching_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, alert_id, listing_id, kind, title, body)
  SELECT
    a.user_id,
    a.id,
    NEW.id,
    'instant',
    CASE WHEN NEW.source = 'Owner'
      THEN 'New ' || NEW.bhk || ' BHK in ' || NEW.area
      ELSE 'To-Let board spotted in ' || NEW.area
    END,
    NEW.title || ' — ₹' || NEW.rent || '/mo, ' || NEW.furnishing || ' · matches "' || a.name || '"'
  FROM public.saved_alerts a
  WHERE a.instant
    AND a.user_id IS DISTINCT FROM NEW.owner_id
    AND NEW.rent <= a.max_rent
    AND (cardinality(a.bhk) = 0 OR NEW.bhk = ANY (a.bhk))
    AND (cardinality(a.furnishing) = 0 OR NEW.furnishing = ANY (a.furnishing))
    AND (cardinality(a.amenities) = 0 OR NEW.amenities @> a.amenities)
    AND (NOT a.owner_only OR NEW.source = 'Owner');

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_matching_alerts() FROM anon, authenticated;

CREATE TRIGGER listings_notify_alerts
  AFTER INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.notify_matching_alerts();

CREATE OR REPLACE FUNCTION public.send_daily_alert_digests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, alert_id, kind, title, body)
  SELECT
    a.user_id,
    a.id,
    'digest',
    m.total || ' new ' || CASE WHEN m.total = 1 THEN 'home' ELSE 'homes' END || ' matched "' || a.name || '"',
    'Yesterday in ' || m.areas || '. Rents from ₹' || m.min_rent || ' to ₹' || m.max_rent || '/mo.'
  FROM public.saved_alerts a
  CROSS JOIN LATERAL (
    SELECT
      count(*) AS total,
      min(l.rent) AS min_rent,
      max(l.rent) AS max_rent,
      string_agg(DISTINCT l.area, ', ') AS areas
    FROM public.listings l
    WHERE l.status = 'published'
      AND l.created_at >= now() - interval '1 day'
      AND l.owner_id IS DISTINCT FROM a.user_id
      AND l.rent <= a.max_rent
      AND (cardinality(a.bhk) = 0 OR l.bhk = ANY (a.bhk))
      AND (cardinality(a.furnishing) = 0 OR l.furnishing = ANY (a.furnishing))
      AND (cardinality(a.amenities) = 0 OR l.amenities @> a.amenities)
      AND (NOT a.owner_only OR l.source = 'Owner')
  ) m
  WHERE a.daily_digest AND m.total > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_daily_alert_digests() FROM anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'nakkobroker-daily-alert-digest',
  '30 3 * * *',
  $$SELECT public.send_daily_alert_digests();$$
);