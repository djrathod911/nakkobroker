CREATE TABLE public.rent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  month date NOT NULL,
  amount integer NOT NULL DEFAULT 0 CHECK (amount >= 0),
  paid_on date NOT NULL DEFAULT current_date,
  receipt_path text,
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','on_time','late','rejected')),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, listing_id, month)
);
CREATE INDEX rent_payments_owner_idx ON public.rent_payments(owner_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rent_payments TO authenticated;
GRANT ALL ON public.rent_payments TO service_role;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon rent payments" ON public.rent_payments AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Participants read rent payments" ON public.rent_payments FOR SELECT TO authenticated
  USING (auth.uid() = tenant_id OR auth.uid() = owner_id);
CREATE POLICY "Tenants log own rent payments" ON public.rent_payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Participants update rent payments" ON public.rent_payments FOR UPDATE TO authenticated
  USING (auth.uid() = tenant_id OR auth.uid() = owner_id)
  WITH CHECK (auth.uid() = tenant_id OR auth.uid() = owner_id);
CREATE POLICY "Tenants delete pending payments" ON public.rent_payments FOR DELETE TO authenticated
  USING (auth.uid() = tenant_id AND status = 'pending');

CREATE OR REPLACE FUNCTION public.guard_rent_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT owner_id INTO _owner FROM public.listings WHERE id = NEW.listing_id;
    IF _owner IS NULL THEN RAISE EXCEPTION 'This home has no owner on NakkoBroker to confirm payments'; END IF;
    IF _owner = NEW.tenant_id THEN RAISE EXCEPTION 'You cannot log rent for your own home'; END IF;
    NEW.owner_id := _owner;
    NEW.month := date_trunc('month', NEW.month)::date;
    NEW.status := 'pending';
    NEW.confirmed_at := NULL;
    RETURN NEW;
  END IF;

  IF current_setting('role', true) = 'service_role' OR current_user IN ('postgres','supabase_admin') THEN
    RETURN NEW;
  END IF;

  NEW.tenant_id := OLD.tenant_id; NEW.owner_id := OLD.owner_id; NEW.listing_id := OLD.listing_id;
  NEW.updated_at := now();

  IF auth.uid() = OLD.owner_id THEN
    NEW.month := OLD.month; NEW.amount := OLD.amount; NEW.paid_on := OLD.paid_on;
    NEW.receipt_path := OLD.receipt_path; NEW.note := OLD.note;
    IF NEW.status NOT IN ('on_time','late','rejected') THEN RAISE EXCEPTION 'Invalid status'; END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN NEW.confirmed_at := now(); END IF;
  ELSE
    IF OLD.status <> 'pending' THEN RAISE EXCEPTION 'Confirmed payments cannot be edited'; END IF;
    NEW.status := OLD.status; NEW.confirmed_at := OLD.confirmed_at;
    NEW.month := date_trunc('month', NEW.month)::date;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER rent_payments_guard BEFORE INSERT OR UPDATE ON public.rent_payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_rent_payment();

CREATE OR REPLACE FUNCTION public.notify_rent_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title text;
BEGIN
  SELECT title INTO _title FROM public.listings WHERE id = NEW.listing_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, listing_id, kind, title, body)
    VALUES (NEW.owner_id, NEW.listing_id, 'rent', 'Confirm a rent payment',
      COALESCE(_title,'Your home') || ' — ₹' || NEW.amount || ' for ' || to_char(NEW.month,'Mon YYYY') || ', paid ' || to_char(NEW.paid_on,'DD Mon'));
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pending' THEN
    INSERT INTO public.notifications (user_id, listing_id, kind, title, body)
    VALUES (NEW.tenant_id, NEW.listing_id, 'rent',
      CASE NEW.status WHEN 'on_time' THEN 'Rent confirmed on time' WHEN 'late' THEN 'Rent marked late' ELSE 'Rent payment not confirmed' END,
      COALESCE(_title,'Your home') || ' — ' || to_char(NEW.month,'Mon YYYY'));
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER rent_payments_notify AFTER INSERT OR UPDATE ON public.rent_payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_rent_payment();

CREATE OR REPLACE FUNCTION public.get_renter_reputation(_ids uuid[])
RETURNS TABLE(user_id uuid, on_time_months integer, late_months integer, late_last_year integer, good_renter boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id,
    COALESCE(count(DISTINCT p.month) FILTER (WHERE p.status = 'on_time'),0)::int,
    COALESCE(count(DISTINCT p.month) FILTER (WHERE p.status = 'late'),0)::int,
    COALESCE(count(DISTINCT p.month) FILTER (WHERE p.status = 'late' AND p.month >= (current_date - interval '12 months')),0)::int,
    (COALESCE(count(DISTINCT p.month) FILTER (WHERE p.status = 'on_time'),0) >= 12
      AND COALESCE(count(DISTINCT p.month) FILTER (WHERE p.status = 'late' AND p.month >= (current_date - interval '12 months')),0) <= 1)
  FROM unnest(_ids) AS u(id)
  LEFT JOIN public.rent_payments p ON p.tenant_id = u.id
  GROUP BY u.id
$$;
REVOKE EXECUTE ON FUNCTION public.get_renter_reputation(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_renter_reputation(uuid[]) TO service_role;
REVOKE EXECUTE ON FUNCTION public.guard_rent_payment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_rent_payment() FROM PUBLIC, anon, authenticated;

CREATE POLICY "Owners read rent receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'move-in-folder' AND EXISTS (
    SELECT 1 FROM public.rent_payments rp WHERE rp.receipt_path = objects.name AND rp.owner_id = auth.uid()));