-- Listing photos are no longer downloadable by signed-out visitors.
-- Signed-in people can view photos of published homes; owners always see their own.
drop policy if exists "Published listing photos are readable" on storage.objects;

create policy "Signed-in users read published listing photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'listing-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid()::text)
    or exists (
      select 1 from public.listings l
      where l.status = 'published' and storage.objects.name = any (l.photos)
    )
  )
);
