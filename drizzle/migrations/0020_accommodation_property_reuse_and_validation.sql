DO $$ DECLARE definition text; BEGIN
 SELECT pg_get_functiondef('public.save_accommodation(jsonb,jsonb,uuid)'::regprocedure) INTO definition;
 definition := replace(definition, 'IF auth.uid() IS NULL THEN', 'IF _id IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended(_id::text, 0)); END IF; IF auth.uid() IS NULL THEN');
 definition := replace(definition, 'INSERT INTO public.accommodation_properties(creator_id,details) VALUES(auth.uid(),', 'INSERT INTO public.accommodation_properties(creator_id,existing_listing_id,details) VALUES(auth.uid(),NULLIF(_listing->>''existing_listing_id'','''')::uuid,');
 EXECUTE definition;
END; $$;
CREATE OR REPLACE FUNCTION public.guard_shared_offer_values() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE key text; BEGIN
 IF NEW.listing_category IN ('flatmate','room_bed') THEN
  FOREACH key IN ARRAY ARRAY['electricity','water','internet','other','existing_occupants'] LOOP
   IF NEW.shared_details ? key AND (jsonb_typeof(NEW.shared_details->key) <> 'number' OR (NEW.shared_details->>key)::numeric < 0) THEN RAISE EXCEPTION 'Expense contributions and occupancy must be non-negative numbers'; END IF;
  END LOOP;
  IF NEW.status='published' AND (length(btrim(NEW.title))<6 OR NEW.availability_status='available_soon' AND NEW.available_from_date IS NULL) THEN RAISE EXCEPTION 'Add a descriptive title and future move-in date'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER zx_guard_shared_offer_values BEFORE INSERT OR UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.guard_shared_offer_values();