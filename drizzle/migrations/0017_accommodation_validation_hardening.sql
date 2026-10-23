GRANT INSERT (listing_category, accommodation_type, creator_relationship, shared_details, property_group_id), UPDATE (listing_category, accommodation_type, creator_relationship, shared_details, property_group_id) ON public.listings TO authenticated;
CREATE OR REPLACE FUNCTION public.guard_accommodation_private() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE l public.listings; BEGIN
 SELECT * INTO l FROM public.listings WHERE id=NEW.listing_id FOR UPDATE;
 IF l.id IS NULL OR l.listing_category NOT IN ('flatmate','room_bed') OR l.owner_id IS DISTINCT FROM NEW.creator_id THEN RAISE EXCEPTION 'Private details must belong to your accommodation listing'; END IF;
 IF TG_OP='UPDATE' AND (NEW.creator_id IS DISTINCT FROM OLD.creator_id OR NEW.listing_id IS DISTINCT FROM OLD.listing_id) THEN RAISE EXCEPTION 'Cannot transfer private listing details'; END IF;
 IF NEW.total_flat_rent < 0 OR NEW.total_flat_rent > 1000000 OR NEW.permission_answer NOT IN ('','confirmed','not_required','pending') THEN RAISE EXCEPTION 'Invalid finance or permission information'; END IF;
 IF l.status='published' AND l.creator_relationship='tenant' AND (NOT NEW.permission_confirmed OR NEW.permission_answer='') THEN RAISE EXCEPTION 'Unpublish before removing your permission declaration'; END IF;
 IF l.status='published' THEN UPDATE public.listings SET shared_details=(shared_details-'total_flat_rent') || CASE WHEN NEW.disclose_total_rent THEN jsonb_build_object('total_flat_rent',NEW.total_flat_rent) ELSE '{}'::jsonb END WHERE id=l.id; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER guard_accommodation_private BEFORE INSERT OR UPDATE ON public.accommodation_private FOR EACH ROW EXECUTE FUNCTION public.guard_accommodation_private();
CREATE OR REPLACE FUNCTION public.guard_accommodation_property() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_OP='UPDATE' AND NEW.creator_id IS DISTINCT FROM OLD.creator_id THEN RAISE EXCEPTION 'Cannot transfer a property'; END IF;
 IF NEW.existing_listing_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.listings WHERE id=NEW.existing_listing_id AND owner_id=NEW.creator_id) THEN RAISE EXCEPTION 'You can only link your own listing'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER guard_accommodation_property BEFORE INSERT OR UPDATE ON public.accommodation_properties FOR EACH ROW EXECUTE FUNCTION public.guard_accommodation_property();
CREATE OR REPLACE FUNCTION public.guard_shared_public_fields() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE safe jsonb; BEGIN
 IF NEW.listing_category <> 'entire_property' THEN
 SELECT COALESCE(jsonb_object_agg(key,value),'{}'::jsonb) INTO safe FROM jsonb_each(NEW.shared_details) WHERE key=ANY(ARRAY['building_name','bathroom_type','room_furnishing','wardrobe','existing_occupants','introduction','occupation','gender','lifestyle','smoking','food','pets','household','rules','landmarks','utilities_included','electricity','water','internet','other','photo_labels','total_flat_rent','contact_preference']);
 NEW.shared_details:=safe;
 IF NEW.rent>1000000 OR NEW.deposit>10000000 OR NEW.maintenance>100000 OR NEW.bhk<1 OR NEW.bhk>20 OR NEW.bathrooms<1 OR NEW.bathrooms>20 THEN RAISE EXCEPTION 'Accommodation amounts or configuration are outside supported limits'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER zy_guard_shared_public_fields BEFORE INSERT OR UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.guard_shared_public_fields();