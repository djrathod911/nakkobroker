DROP POLICY IF EXISTS "Listing photos are readable" ON storage.objects;

CREATE POLICY "Published listing photos are readable"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'listing-photos'
  AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.status = 'published' AND storage.objects.name = ANY (l.photos)
  )
);

CREATE POLICY "Owners can read own listing photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'listing-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

REVOKE SELECT (contact_phone) ON public.listings FROM anon;