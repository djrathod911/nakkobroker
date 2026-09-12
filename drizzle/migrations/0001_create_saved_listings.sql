CREATE TABLE public.saved_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX saved_listings_user_idx ON public.saved_listings (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.saved_listings TO authenticated;
GRANT ALL ON public.saved_listings TO service_role;

ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No anon saved listing access" ON public.saved_listings
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Users view own saved listings" ON public.saved_listings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users save listings" ON public.saved_listings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users unsave listings" ON public.saved_listings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);