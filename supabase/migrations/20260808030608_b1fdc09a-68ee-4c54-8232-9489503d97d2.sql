DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;

CREATE POLICY "Users view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.get_profile_display_names(_ids uuid[])
RETURNS TABLE (id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND (
      p.id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE (c.tenant_id = auth.uid() AND c.owner_id = p.id)
           OR (c.owner_id = auth.uid() AND c.tenant_id = p.id)
      )
      OR EXISTS (
        SELECT 1 FROM public.listings l
        WHERE l.owner_id = p.id AND l.status = 'published'
      )
    )
$$;

REVOKE ALL ON FUNCTION public.get_profile_display_names(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_display_names(uuid[]) TO authenticated;