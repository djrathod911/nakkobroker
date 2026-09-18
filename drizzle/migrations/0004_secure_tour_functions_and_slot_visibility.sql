-- 1) Tour slots are only visible for published listings
DROP POLICY IF EXISTS "Anyone can see tour slots" ON public.tour_slots;

CREATE POLICY "Tour slots of published homes are visible"
ON public.tour_slots
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = tour_slots.listing_id
      AND l.status = 'published'
  )
  OR auth.uid() = owner_id
);

-- 2) Take the SECURITY DEFINER booking routines off the client API surface.
--    They now require an explicit actor id and are callable only by service_role
--    (used by authenticated TanStack server functions).
CREATE OR REPLACE FUNCTION public.book_tour_slot(_slot_id uuid, _actor uuid, _note text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _slot public.tour_slots%ROWTYPE;
  _booking_id uuid;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Sign in to book a tour';
  END IF;

  UPDATE public.tour_slots
     SET status = 'booked'
   WHERE id = _slot_id
     AND status = 'open'
     AND starts_at > now()
  RETURNING * INTO _slot;

  IF _slot.id IS NULL THEN
    RAISE EXCEPTION 'This slot is no longer available';
  END IF;

  IF _slot.owner_id = _actor THEN
    RAISE EXCEPTION 'You cannot book your own home';
  END IF;

  INSERT INTO public.tour_bookings (slot_id, listing_id, owner_id, tenant_id, note)
  VALUES (_slot.id, _slot.listing_id, _slot.owner_id, _actor, NULLIF(_note, ''))
  RETURNING id INTO _booking_id;

  RETURN _booking_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_tour_booking(_booking_id uuid, _actor uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _slot_id uuid;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Sign in to manage tours';
  END IF;

  UPDATE public.tour_bookings
     SET status = 'cancelled'
   WHERE id = _booking_id
     AND status = 'confirmed'
     AND (tenant_id = _actor OR owner_id = _actor)
  RETURNING slot_id INTO _slot_id;

  IF _slot_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  UPDATE public.tour_slots SET status = 'open' WHERE id = _slot_id;
END;
$function$;

DROP FUNCTION IF EXISTS public.book_tour_slot(uuid, text);
DROP FUNCTION IF EXISTS public.cancel_tour_booking(uuid);

REVOKE ALL ON FUNCTION public.book_tour_slot(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_tour_booking(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_tour_slot(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_tour_booking(uuid, uuid) TO service_role;