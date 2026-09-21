-- Owner phone numbers must never be selectable from the listings table by
-- app clients; they are only served by the authenticated contact server fn.
REVOKE SELECT ON public.listings FROM anon, authenticated;

DO $$
DECLARE col text;
BEGIN
  FOR col IN
    SELECT attname FROM pg_attribute
    WHERE attrelid = 'public.listings'::regclass
      AND attnum > 0 AND NOT attisdropped
      AND attname NOT IN ('contact_phone', 'owner_phone_norm')
  LOOP
    EXECUTE format('GRANT SELECT (%I) ON public.listings TO anon, authenticated', col);
  END LOOP;
END $$;