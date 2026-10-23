ALTER TABLE public.listings ADD COLUMN listing_category text NOT NULL DEFAULT 'entire_property', ADD COLUMN accommodation_type text NOT NULL DEFAULT 'entire_property', ADD COLUMN creator_relationship text NOT NULL DEFAULT 'owner', ADD COLUMN shared_details jsonb NOT NULL DEFAULT '{}'::jsonb, ADD COLUMN property_group_id uuid;
GRANT SELECT (listing_category, accommodation_type, creator_relationship, shared_details, property_group_id) ON public.listings TO anon, authenticated;
CREATE TABLE public.accommodation_properties (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), creator_id uuid NOT NULL, existing_listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL, details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accommodation_properties TO authenticated;
GRANT ALL ON public.accommodation_properties TO service_role;
ALTER TABLE public.accommodation_properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators manage their accommodation properties" ON public.accommodation_properties TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
ALTER TABLE public.listings ADD CONSTRAINT listings_property_group_fkey FOREIGN KEY (property_group_id) REFERENCES public.accommodation_properties(id) ON DELETE SET NULL;
CREATE TABLE public.accommodation_private (listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE, creator_id uuid NOT NULL, total_flat_rent integer NOT NULL DEFAULT 0, disclose_total_rent boolean NOT NULL DEFAULT false, permission_answer text NOT NULL DEFAULT '', permission_confirmed boolean NOT NULL DEFAULT false);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accommodation_private TO authenticated;
GRANT ALL ON public.accommodation_private TO service_role;
ALTER TABLE public.accommodation_private ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators manage private accommodation finance" ON public.accommodation_private TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid() AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.owner_id = auth.uid()));
DROP INDEX IF EXISTS public.listings_one_per_phone_city_type;
CREATE UNIQUE INDEX listings_one_per_phone_city_type ON public.listings(owner_phone_norm,city,house_type) WHERE status = 'published' AND owner_phone_norm IS NOT NULL AND listing_category = 'entire_property';
CREATE OR REPLACE FUNCTION public.validate_accommodation_listing() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.listing_category NOT IN ('entire_property','flatmate','room_bed') OR NEW.creator_relationship NOT IN ('owner','tenant','provider') OR NEW.accommodation_type NOT IN ('entire_property','private_room','shared_room','bed') THEN RAISE EXCEPTION 'Invalid accommodation category'; END IF;
 IF NEW.listing_category <> 'entire_property' THEN
  IF NEW.accommodation_type = 'entire_property' OR NEW.rent <= 0 OR NEW.deposit < 0 OR NEW.maintenance < 0 THEN RAISE EXCEPTION 'Check accommodation type and contributions'; END IF;
  IF NEW.listing_category = 'flatmate' AND NEW.creator_relationship <> 'tenant' THEN RAISE EXCEPTION 'Flatmate listings must be tenant-created'; END IF;
  IF NEW.property_group_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.accommodation_properties p WHERE p.id=NEW.property_group_id AND p.creator_id=NEW.owner_id) THEN RAISE EXCEPTION 'Property not available to this creator'; END IF;
  IF NEW.creator_relationship <> 'owner' THEN NEW.owner_verified := false; END IF;
  IF NEW.status='published' AND NEW.creator_relationship='tenant' AND NOT EXISTS (SELECT 1 FROM public.accommodation_private p WHERE p.listing_id=NEW.id AND p.creator_id=NEW.owner_id AND p.permission_confirmed AND p.permission_answer IN ('confirmed','not_required','pending')) THEN RAISE EXCEPTION 'Confirm your tenancy and required permissions before publishing'; END IF;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER zz_validate_accommodation_listing BEFORE INSERT OR UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.validate_accommodation_listing();
CREATE OR REPLACE FUNCTION public.save_accommodation(_listing jsonb, _private jsonb, _id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE result_id uuid; property_id uuid; public_details jsonb; desired_status text; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to list accommodation'; END IF;
 desired_status := COALESCE(_listing->>'status','draft');
 IF desired_status NOT IN ('draft','published','delisted') OR _listing->>'listing_category' NOT IN ('flatmate','room_bed') THEN RAISE EXCEPTION 'Invalid publication status or category'; END IF;
 IF COALESCE((_private->>'total_flat_rent')::integer,0) < 0 THEN RAISE EXCEPTION 'Total rent cannot be negative'; END IF;
 property_id := NULLIF(_listing->>'property_group_id','')::uuid;
 IF property_id IS NULL THEN
  INSERT INTO public.accommodation_properties(creator_id,details) VALUES(auth.uid(),jsonb_build_object('city',_listing->>'city','area',_listing->>'area','building_name',_listing->'shared_details'->>'building_name','bhk',_listing->'bhk','bathrooms',_listing->'bathrooms')) RETURNING id INTO property_id;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.accommodation_properties WHERE id=property_id AND creator_id=auth.uid()) THEN RAISE EXCEPTION 'Property not found'; END IF;
 public_details := COALESCE(_listing->'shared_details','{}'::jsonb) - 'total_flat_rent' - 'permission_answer' - 'permission_confirmed';
 IF COALESCE((_private->>'disclose_total_rent')::boolean,false) THEN public_details := public_details || jsonb_build_object('total_flat_rent',(_private->>'total_flat_rent')::integer); END IF;
 IF _id IS NULL THEN
  INSERT INTO public.listings(owner_id,title,city,area,bhk,bathrooms,rent,deposit,maintenance,furnishing,description,amenities,photos,lng,lat,source,status,listing_category,accommodation_type,creator_relationship,shared_details,property_group_id,available_from,availability_status,available_from_date,parking,floor,metro_km,it_corridor_km)
  VALUES(auth.uid(),_listing->>'title',_listing->>'city',_listing->>'area',(_listing->>'bhk')::integer,(_listing->>'bathrooms')::integer,(_listing->>'rent')::integer,(_listing->>'deposit')::integer,(_listing->>'maintenance')::integer,_listing->>'furnishing',COALESCE(_listing->>'description',''),ARRAY(SELECT jsonb_array_elements_text(_listing->'amenities')),ARRAY(SELECT jsonb_array_elements_text(_listing->'photos')),(_listing->>'lng')::float8,(_listing->>'lat')::float8,'Owner','draft',_listing->>'listing_category',_listing->>'accommodation_type',_listing->>'creator_relationship',public_details,property_id,_listing->>'available_from',_listing->>'availability_status',NULLIF(_listing->>'available_from_date','')::date,COALESCE(_listing->>'parking','None'),COALESCE((_listing->>'floor')::integer,0),COALESCE((_listing->>'metro_km')::numeric,0),COALESCE((_listing->>'it_corridor_km')::numeric,0)) RETURNING id INTO result_id;
 ELSE
  UPDATE public.listings SET title=_listing->>'title',city=_listing->>'city',area=_listing->>'area',bhk=(_listing->>'bhk')::integer,bathrooms=(_listing->>'bathrooms')::integer,rent=(_listing->>'rent')::integer,deposit=(_listing->>'deposit')::integer,maintenance=(_listing->>'maintenance')::integer,furnishing=_listing->>'furnishing',description=COALESCE(_listing->>'description',''),amenities=ARRAY(SELECT jsonb_array_elements_text(_listing->'amenities')),photos=ARRAY(SELECT jsonb_array_elements_text(_listing->'photos')),lng=(_listing->>'lng')::float8,lat=(_listing->>'lat')::float8,accommodation_type=_listing->>'accommodation_type',creator_relationship=_listing->>'creator_relationship',shared_details=public_details,property_group_id=property_id,available_from=_listing->>'available_from',availability_status=_listing->>'availability_status',available_from_date=NULLIF(_listing->>'available_from_date','')::date,parking=COALESCE(_listing->>'parking','None'),floor=COALESCE((_listing->>'floor')::integer,0),metro_km=COALESCE((_listing->>'metro_km')::numeric,0),it_corridor_km=COALESCE((_listing->>'it_corridor_km')::numeric,0),status='draft' WHERE id=_id AND owner_id=auth.uid() AND listing_category <> 'entire_property' RETURNING id INTO result_id;
  IF result_id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;
 END IF;
 INSERT INTO public.accommodation_private(listing_id,creator_id,total_flat_rent,disclose_total_rent,permission_answer,permission_confirmed) VALUES(result_id,auth.uid(),COALESCE((_private->>'total_flat_rent')::integer,0),COALESCE((_private->>'disclose_total_rent')::boolean,false),COALESCE(_private->>'permission_answer',''),COALESCE((_private->>'permission_confirmed')::boolean,false)) ON CONFLICT(listing_id) DO UPDATE SET total_flat_rent=EXCLUDED.total_flat_rent,disclose_total_rent=EXCLUDED.disclose_total_rent,permission_answer=EXCLUDED.permission_answer,permission_confirmed=EXCLUDED.permission_confirmed;
 UPDATE public.listings SET status=desired_status,map_visible=true WHERE id=result_id AND owner_id=auth.uid();
 RETURN result_id;
END; $$;
REVOKE ALL ON FUNCTION public.save_accommodation(jsonb,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_accommodation(jsonb,jsonb,uuid) TO authenticated,service_role;