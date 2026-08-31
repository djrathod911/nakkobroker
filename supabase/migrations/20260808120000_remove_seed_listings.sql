-- Remove all seeded dummy listings that have no owner (inserted during initial development).
-- Real user-submitted listings are always created with an owner_id; these seed rows have NULL.
DELETE FROM public.listings WHERE owner_id IS NULL;
