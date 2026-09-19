GRANT SELECT ON public.listings TO anon, authenticated;
GRANT SELECT ON public.listing_lifecycle_rules TO anon;
GRANT SELECT ON public.listing_lifecycle_rules TO authenticated;
GRANT ALL ON public.listing_lifecycle_rules TO service_role;
NOTIFY pgrst, 'reload schema';