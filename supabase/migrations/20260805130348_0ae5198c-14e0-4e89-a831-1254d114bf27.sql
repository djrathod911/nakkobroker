-- normalize Indian mobile numbers to last 10 digits
CREATE OR REPLACE FUNCTION public.normalize_in_phone(_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(RIGHT(regexp_replace(COALESCE(_phone, ''), '\D', '', 'g'), 10), '')
$$;

CREATE TABLE public.verified_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, phone)
);

GRANT SELECT ON public.verified_phones TO authenticated;
GRANT ALL ON public.verified_phones TO service_role;

ALTER TABLE public.verified_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own verified phones"
ON public.verified_phones FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- OTP codes: backend only, no client access at all
CREATE TABLE public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.phone_otps TO service_role;

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

CREATE INDEX phone_otps_user_phone_idx ON public.phone_otps (user_id, phone, created_at DESC);

-- listings.owner_verified is derived, never client-supplied
CREATE OR REPLACE FUNCTION public.set_listing_owner_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.owner_verified := (
    NEW.owner_id IS NOT NULL
    AND public.normalize_in_phone(NEW.contact_phone) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.verified_phones v
      WHERE v.user_id = NEW.owner_id
        AND v.phone = public.normalize_in_phone(NEW.contact_phone)
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER listings_owner_verified
BEFORE INSERT OR UPDATE OF contact_phone, owner_id ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.set_listing_owner_verified();

REVOKE EXECUTE ON FUNCTION public.set_listing_owner_verified() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_in_phone(text) FROM anon, authenticated;