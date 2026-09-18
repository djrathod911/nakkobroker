CREATE TABLE IF NOT EXISTS public.tour_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'booked', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, starts_at)
);

CREATE INDEX IF NOT EXISTS tour_slots_listing_idx ON public.tour_slots (listing_id, starts_at);

GRANT SELECT ON public.tour_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_slots TO authenticated;
GRANT ALL ON public.tour_slots TO service_role;

ALTER TABLE public.tour_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see tour slots" ON public.tour_slots
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Owners create tour slots" ON public.tour_slots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners update tour slots" ON public.tour_slots
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners delete tour slots" ON public.tour_slots
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.tour_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL UNIQUE REFERENCES public.tour_slots(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tour_bookings_tenant_idx ON public.tour_bookings (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tour_bookings_owner_idx ON public.tour_bookings (owner_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.tour_bookings TO authenticated;
GRANT ALL ON public.tour_bookings TO service_role;

ALTER TABLE public.tour_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon tour bookings" ON public.tour_bookings
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Participants read tour bookings" ON public.tour_bookings
  FOR SELECT TO authenticated USING (auth.uid() = tenant_id OR auth.uid() = owner_id);

CREATE POLICY "Participants update tour bookings" ON public.tour_bookings
  FOR UPDATE TO authenticated
  USING (auth.uid() = tenant_id OR auth.uid() = owner_id)
  WITH CHECK (auth.uid() = tenant_id OR auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.book_tour_slot(_slot_id uuid, _note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slot public.tour_slots%ROWTYPE;
  _booking_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
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

  IF _slot.owner_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot book your own home';
  END IF;

  INSERT INTO public.tour_bookings (slot_id, listing_id, owner_id, tenant_id, note)
  VALUES (_slot.id, _slot.listing_id, _slot.owner_id, auth.uid(), NULLIF(_note, ''))
  RETURNING id INTO _booking_id;

  RETURN _booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.book_tour_slot(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.book_tour_slot(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.book_tour_slot(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_tour_booking(_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slot_id uuid;
BEGIN
  UPDATE public.tour_bookings
     SET status = 'cancelled'
   WHERE id = _booking_id
     AND status = 'confirmed'
     AND (tenant_id = auth.uid() OR owner_id = auth.uid())
  RETURNING slot_id INTO _slot_id;

  IF _slot_id IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  UPDATE public.tour_slots SET status = 'open' WHERE id = _slot_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_tour_booking(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_tour_booking(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_tour_booking(uuid) TO authenticated;