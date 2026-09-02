ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'available'
    CHECK (availability_status IN ('available', 'occupied', 'available_soon')),
  ADD COLUMN IF NOT EXISTS available_from_date DATE,
  ADD COLUMN IF NOT EXISTS map_visible BOOLEAN NOT NULL DEFAULT true;

GRANT SELECT (availability_status, available_from_date, map_visible)
  ON public.listings TO anon, authenticated;

GRANT ALL ON public.listings TO service_role;