GRANT INSERT, UPDATE, DELETE ON public.listings TO authenticated;
-- Existing ownership RLS scopes all writes; contact_phone remains excluded from SELECT.
GRANT ALL ON public.listings TO service_role;