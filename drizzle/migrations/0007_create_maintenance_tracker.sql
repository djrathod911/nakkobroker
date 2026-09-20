CREATE TABLE public.maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  property_label text NOT NULL DEFAULT '',
  title text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  cost integer NOT NULL DEFAULT 0,
  reported_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_requests_priority_check CHECK (priority IN ('low','normal','urgent')),
  CONSTRAINT maintenance_requests_status_check CHECK (status IN ('open','in_progress','resolved')),
  CONSTRAINT maintenance_requests_category_check CHECK (category IN ('plumbing','electrical','appliance','carpentry','pest','cleaning','structural','other'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_requests TO authenticated;
GRANT ALL ON public.maintenance_requests TO service_role;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No anon maintenance access" ON public.maintenance_requests AS RESTRICTIVE TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Participants read maintenance requests" ON public.maintenance_requests FOR SELECT TO authenticated
  USING (auth.uid() = tenant_id OR auth.uid() = owner_id);
CREATE POLICY "Tenants create maintenance requests" ON public.maintenance_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Participants update maintenance requests" ON public.maintenance_requests FOR UPDATE TO authenticated
  USING (auth.uid() = tenant_id OR auth.uid() = owner_id)
  WITH CHECK (auth.uid() = tenant_id OR auth.uid() = owner_id);
CREATE POLICY "Tenants delete own maintenance requests" ON public.maintenance_requests FOR DELETE TO authenticated
  USING (auth.uid() = tenant_id);

CREATE TABLE public.maintenance_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'message',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_updates_kind_check CHECK (kind IN ('message','status'))
);

GRANT SELECT, INSERT, DELETE ON public.maintenance_updates TO authenticated;
GRANT ALL ON public.maintenance_updates TO service_role;
ALTER TABLE public.maintenance_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No anon maintenance update access" ON public.maintenance_updates AS RESTRICTIVE TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Participants read maintenance updates" ON public.maintenance_updates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.maintenance_requests r WHERE r.id = request_id AND (auth.uid() = r.tenant_id OR auth.uid() = r.owner_id)));
CREATE POLICY "Participants write maintenance updates" ON public.maintenance_updates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND EXISTS (SELECT 1 FROM public.maintenance_requests r WHERE r.id = request_id AND (auth.uid() = r.tenant_id OR auth.uid() = r.owner_id)));
CREATE POLICY "Authors delete own maintenance updates" ON public.maintenance_updates FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

CREATE INDEX maintenance_requests_tenant_idx ON public.maintenance_requests (tenant_id, created_at DESC);
CREATE INDEX maintenance_requests_owner_idx ON public.maintenance_requests (owner_id, created_at DESC);
CREATE INDEX maintenance_updates_request_idx ON public.maintenance_updates (request_id, created_at);

CREATE TRIGGER maintenance_requests_set_updated_at BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fill owner + property label from the linked tenancy/listing, so a tenant
-- cannot claim an arbitrary landlord.
CREATE OR REPLACE FUNCTION public.set_maintenance_request_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _listing_id uuid;
  _label text;
BEGIN
  _listing_id := NEW.listing_id;

  IF NEW.tenancy_id IS NOT NULL THEN
    SELECT t.listing_id, t.property_label INTO _listing_id, _label
    FROM public.tenancies t
    WHERE t.id = NEW.tenancy_id AND t.tenant_id = NEW.tenant_id;
    IF _listing_id IS NULL THEN _listing_id := NEW.listing_id; END IF;
    IF _label IS NOT NULL AND _label <> '' THEN NEW.property_label := _label; END IF;
  END IF;

  NEW.listing_id := _listing_id;

  IF _listing_id IS NOT NULL THEN
    SELECT l.owner_id, COALESCE(NULLIF(NEW.property_label, ''), l.title)
      INTO NEW.owner_id, NEW.property_label
    FROM public.listings l WHERE l.id = _listing_id;
  ELSE
    NEW.owner_id := NULL;
  END IF;

  IF NEW.property_label IS NULL OR NEW.property_label = '' THEN
    NEW.property_label := 'My home';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER maintenance_requests_set_context BEFORE INSERT ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_maintenance_request_context();