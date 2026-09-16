CREATE TABLE public.tenancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  property_label text NOT NULL DEFAULT 'My home',
  address text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  owner_phone text NOT NULL DEFAULT '',
  rent integer NOT NULL DEFAULT 0,
  deposit integer NOT NULL DEFAULT 0,
  lease_start date,
  lease_end date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenancies TO authenticated;
GRANT ALL ON public.tenancies TO service_role;
ALTER TABLE public.tenancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No anon tenancy access" ON public.tenancies AS RESTRICTIVE TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Tenants manage own tenancies" ON public.tenancies FOR ALL TO authenticated
  USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);

CREATE TABLE public.tenancy_utilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'Other',
  provider text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenancy_utilities TO authenticated;
GRANT ALL ON public.tenancy_utilities TO service_role;
ALTER TABLE public.tenancy_utilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No anon utility access" ON public.tenancy_utilities AS RESTRICTIVE TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Tenants manage own utilities" ON public.tenancy_utilities FOR ALL TO authenticated
  USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);

CREATE TABLE public.tenancy_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'other',
  path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  mime_type text NOT NULL DEFAULT '',
  size_bytes integer NOT NULL DEFAULT 0,
  caption text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenancy_files_kind_check CHECK (kind IN ('lease','move_in_photo','move_out_photo','receipt','other'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenancy_files TO authenticated;
GRANT ALL ON public.tenancy_files TO service_role;
ALTER TABLE public.tenancy_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No anon file access" ON public.tenancy_files AS RESTRICTIVE TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Tenants manage own files" ON public.tenancy_files FOR ALL TO authenticated
  USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);

CREATE INDEX tenancies_tenant_idx ON public.tenancies (tenant_id, created_at DESC);
CREATE INDEX tenancy_utilities_tenancy_idx ON public.tenancy_utilities (tenancy_id);
CREATE INDEX tenancy_files_tenancy_idx ON public.tenancy_files (tenancy_id, created_at DESC);

CREATE TRIGGER tenancies_set_updated_at BEFORE UPDATE ON public.tenancies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Tenants read own move-in files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'move-in-folder' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Tenants upload own move-in files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'move-in-folder' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Tenants delete own move-in files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'move-in-folder' AND (storage.foldername(name))[1] = auth.uid()::text);
