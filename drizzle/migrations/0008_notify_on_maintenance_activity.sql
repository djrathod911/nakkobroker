-- Notify the owner when a tenant logs a repair, and notify the other
-- party when someone posts an update in a repair thread.

CREATE OR REPLACE FUNCTION public.notify_maintenance_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL AND NEW.owner_id <> NEW.tenant_id THEN
    INSERT INTO public.notifications (user_id, listing_id, kind, title, body)
    VALUES (
      NEW.owner_id,
      NEW.listing_id,
      'repair',
      'New repair reported',
      COALESCE(NULLIF(NEW.property_label, ''), 'Your home') || ': ' || NEW.title
        || CASE WHEN NEW.priority = 'urgent' THEN ' (urgent)' ELSE '' END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_maintenance_request_trg ON public.maintenance_requests;
CREATE TRIGGER notify_maintenance_request_trg
AFTER INSERT ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_maintenance_request();

CREATE OR REPLACE FUNCTION public.notify_maintenance_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.maintenance_requests;
  recipient uuid;
BEGIN
  SELECT * INTO req FROM public.maintenance_requests WHERE id = NEW.request_id;
  IF req.id IS NULL THEN RETURN NEW; END IF;

  IF NEW.author_id = req.tenant_id THEN
    recipient := req.owner_id;
  ELSE
    recipient := req.tenant_id;
  END IF;

  IF recipient IS NULL OR recipient = NEW.author_id THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, listing_id, kind, title, body)
  VALUES (
    recipient,
    req.listing_id,
    'repair',
    CASE WHEN NEW.kind = 'status' THEN 'Repair updated' ELSE 'New message about a repair' END,
    req.title || ': ' || left(NEW.body, 160)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_maintenance_update_trg ON public.maintenance_updates;
CREATE TRIGGER notify_maintenance_update_trg
AFTER INSERT ON public.maintenance_updates
FOR EACH ROW EXECUTE FUNCTION public.notify_maintenance_update();