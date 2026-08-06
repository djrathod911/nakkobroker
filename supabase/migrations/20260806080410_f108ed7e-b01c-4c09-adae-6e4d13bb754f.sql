CREATE TABLE public.login_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.login_otps TO service_role;
ALTER TABLE public.login_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No client access to login_otps" ON public.login_otps
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE INDEX login_otps_phone_created_idx ON public.login_otps (phone, created_at DESC);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT 'Hyderabad',
  ADD COLUMN IF NOT EXISTS house_type text NOT NULL DEFAULT 'Flat',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS floor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_floors integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bathrooms integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS balconies integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parking text NOT NULL DEFAULT 'None',
  ADD COLUMN IF NOT EXISTS facing text NOT NULL DEFAULT 'East',
  ADD COLUMN IF NOT EXISTS owner_phone_norm text;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_house_type_check CHECK (house_type IN ('Flat', 'Villa'));

CREATE OR REPLACE FUNCTION public.set_listing_phone_norm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.owner_phone_norm := public.normalize_in_phone(NEW.contact_phone);
  RETURN NEW;
END;
$$;

CREATE TRIGGER listings_phone_norm
BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.set_listing_phone_norm();

UPDATE public.listings SET owner_phone_norm = public.normalize_in_phone(contact_phone);

CREATE UNIQUE INDEX listings_one_per_phone_city_type
  ON public.listings (owner_phone_norm, city, house_type)
  WHERE status = 'published' AND owner_phone_norm IS NOT NULL;

GRANT SELECT (city, house_type, description, floor, total_floors, bathrooms, balconies, parking, facing)
  ON public.listings TO anon, authenticated;
