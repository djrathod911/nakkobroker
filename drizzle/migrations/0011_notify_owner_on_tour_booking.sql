CREATE OR REPLACE FUNCTION public.notify_tour_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _title text;
  _starts timestamptz;
BEGIN
  IF NEW.owner_id IS NULL OR NEW.owner_id = NEW.tenant_id THEN
    RETURN NEW;
  END IF;

  SELECT l.title INTO _title FROM public.listings l WHERE l.id = NEW.listing_id;
  SELECT s.starts_at INTO _starts FROM public.tour_slots s WHERE s.id = NEW.slot_id;

  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    INSERT INTO public.notifications (user_id, listing_id, kind, title, body)
    VALUES (
      NEW.owner_id,
      NEW.listing_id,
      'tour',
      'New tour booked',
      COALESCE(_title, 'Your home') || ' — ' ||
      COALESCE(to_char(_starts AT TIME ZONE 'Asia/Kolkata', 'Dy DD Mon, HH12:MI am'), 'a booked time')
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    INSERT INTO public.notifications (user_id, listing_id, kind, title, body)
    VALUES (
      NEW.owner_id,
      NEW.listing_id,
      'tour',
      'A tour was cancelled',
      COALESCE(_title, 'Your home') || ' — ' ||
      COALESCE(to_char(_starts AT TIME ZONE 'Asia/Kolkata', 'Dy DD Mon, HH12:MI am'), 'a booked time')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_tour_booking_trg ON public.tour_bookings;
CREATE TRIGGER notify_tour_booking_trg
AFTER INSERT OR UPDATE ON public.tour_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_tour_booking();

REVOKE EXECUTE ON FUNCTION public.notify_tour_booking() FROM PUBLIC, anon, authenticated;