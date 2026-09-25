CREATE OR REPLACE FUNCTION public.guard_rent_payment()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    -- Received payments are judged against the fixed due date: the 5th of the rent month.
    IF NEW.status IN ('on_time','late') THEN
      NEW.status := CASE WHEN OLD.paid_on <= (OLD.month + 4) THEN 'on_time' ELSE 'late' END;
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN NEW.confirmed_at := now(); END IF;
  ELSE
    IF OLD.status <> 'pending' THEN RAISE EXCEPTION 'Confirmed payments cannot be edited'; END IF;
    NEW.status := OLD.status; NEW.confirmed_at := OLD.confirmed_at;
    NEW.month := date_trunc('month', NEW.month)::date;
  END IF;
  RETURN NEW;
END; $function$;