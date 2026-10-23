CREATE OR REPLACE FUNCTION public.guard_accommodation_private() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE l record; BEGIN
 SELECT id,listing_category,owner_id,status,creator_relationship INTO l FROM public.listings WHERE id=NEW.listing_id FOR UPDATE;
 IF l.id IS NULL OR l.listing_category NOT IN ('flatmate','room_bed') OR l.owner_id IS DISTINCT FROM NEW.creator_id THEN RAISE EXCEPTION 'Private details must belong to your accommodation listing'; END IF;
 IF TG_OP='UPDATE' AND (NEW.creator_id IS DISTINCT FROM OLD.creator_id OR NEW.listing_id IS DISTINCT FROM OLD.listing_id) THEN RAISE EXCEPTION 'Cannot transfer private listing details'; END IF;
 IF NEW.total_flat_rent < 0 OR NEW.total_flat_rent > 1000000 OR NEW.permission_answer NOT IN ('','confirmed','not_required','pending') THEN RAISE EXCEPTION 'Invalid finance or permission information'; END IF;
 IF l.status='published' AND l.creator_relationship='tenant' AND (NOT NEW.permission_confirmed OR NEW.permission_answer='') THEN RAISE EXCEPTION 'Unpublish before removing your permission declaration'; END IF;
 IF l.status='published' THEN UPDATE public.listings SET shared_details=(shared_details-'total_flat_rent') || CASE WHEN NEW.disclose_total_rent THEN jsonb_build_object('total_flat_rent',NEW.total_flat_rent) ELSE '{}'::jsonb END WHERE id=l.id; END IF;
 RETURN NEW;
END; $$;