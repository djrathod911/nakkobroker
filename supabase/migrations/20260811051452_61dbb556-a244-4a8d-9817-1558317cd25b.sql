CREATE TABLE public.listing_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  step integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_drafts TO authenticated;
GRANT ALL ON public.listing_drafts TO service_role;

ALTER TABLE public.listing_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No anon draft access" ON public.listing_drafts
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Users manage own draft" ON public.listing_drafts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER listing_drafts_updated_at
  BEFORE UPDATE ON public.listing_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();