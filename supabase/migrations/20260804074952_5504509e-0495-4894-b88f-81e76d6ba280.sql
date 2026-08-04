CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  area TEXT NOT NULL,
  bhk INTEGER NOT NULL DEFAULT 1,
  rent INTEGER NOT NULL,
  deposit INTEGER NOT NULL DEFAULT 0,
  maintenance INTEGER NOT NULL DEFAULT 0,
  negotiable BOOLEAN NOT NULL DEFAULT false,
  furnishing TEXT NOT NULL DEFAULT 'Unfurnished',
  tenant TEXT NOT NULL DEFAULT 'Anyone',
  owner_verified BOOLEAN NOT NULL DEFAULT false,
  community_verified BOOLEAN NOT NULL DEFAULT false,
  suspicious_price BOOLEAN NOT NULL DEFAULT false,
  metro_km NUMERIC NOT NULL DEFAULT 0,
  it_corridor_km NUMERIC NOT NULL DEFAULT 0,
  sqft INTEGER NOT NULL DEFAULT 0,
  available_from TEXT NOT NULL DEFAULT 'Immediate',
  amenities TEXT[] NOT NULL DEFAULT '{}',
  photos TEXT[] NOT NULL DEFAULT '{}',
  contact_phone TEXT,
  lng DOUBLE PRECISION NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  source TEXT NOT NULL DEFAULT 'Owner',
  status TEXT NOT NULL DEFAULT 'published',
  votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT ON public.listings TO anon;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published listings are public" ON public.listings FOR SELECT USING (status = 'published');
CREATE POLICY "Owners can view own listings" ON public.listings FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Signed-in users can create listings" ON public.listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own listings" ON public.listings FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can delete own listings" ON public.listings FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE INDEX listings_area_idx ON public.listings (area);
CREATE INDEX listings_rent_idx ON public.listings (rent);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.listing_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.listing_votes TO authenticated;
GRANT SELECT ON public.listing_votes TO anon;
GRANT ALL ON public.listing_votes TO service_role;
ALTER TABLE public.listing_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes are viewable by everyone" ON public.listing_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.listing_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own vote" ON public.listing_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_listing_votes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.listings SET votes = votes + 1 WHERE id = NEW.listing_id;
    RETURN NEW;
  ELSE
    UPDATE public.listings SET votes = GREATEST(votes - 1, 0) WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
END; $$;
CREATE TRIGGER listing_votes_sync AFTER INSERT OR DELETE ON public.listing_votes FOR EACH ROW EXECUTE FUNCTION public.sync_listing_votes();

INSERT INTO public.listings (title, area, bhk, rent, deposit, maintenance, negotiable, furnishing, tenant, owner_verified, community_verified, suspicious_price, metro_km, it_corridor_km, sqft, available_from, amenities, lng, lat, source, votes) VALUES
('Airy 2BHK with balcony views','Madhapur',2,32000,100000,2500,true,'Semi Furnished','Family',true,true,false,0.9,1.4,1150,'Immediate','{Lift,"Power Backup",Parking,Gym}',78.3908,17.4483,'Owner',24),
('Bright 3BHK in gated community','Gachibowli',3,48000,200000,4000,false,'Fully Furnished','Anyone',true,false,false,4.2,0.6,1680,'1 Sep','{Lift,"Swimming Pool",Gym,Parking,"Power Backup"}',78.3489,17.4401,'Owner',11),
('Budget 1BHK near metro','Ameerpet',1,12500,40000,800,true,'Unfurnished','Bachelor',false,true,false,0.3,9.8,540,'Immediate','{Lift,Parking}',78.4483,17.4374,'To-Let Board',37),
('Spacious 2BHK, quiet lane','Kondapur',2,26000,80000,1500,true,'Semi Furnished','Family',false,true,false,3.1,2.2,1080,'15 Aug','{Lift,"Power Backup",Parking}',78.3639,17.4622,'To-Let Board',19),
('Premium 4BHK duplex','Jubilee Hills',4,125000,500000,9000,false,'Fully Furnished','Family',true,true,false,2.4,6.1,3400,'Immediate','{Lift,"Swimming Pool",Gym,Parking,"Power Backup"}',78.4089,17.4239,'Owner',6),
('Cosy 1BHK for bachelors','Kukatpally',1,9500,25000,500,true,'Unfurnished','Bachelor',false,false,true,1.1,8.4,480,'Immediate','{Parking}',78.4089,17.4948,'To-Let Board',3),
('Family 3BHK near ORR','Nanakramguda',3,41000,150000,3200,true,'Semi Furnished','Family',true,false,false,6.4,0.9,1520,'1 Sep','{Lift,Gym,Parking,"Power Backup"}',78.3364,17.4211,'Owner',14),
('Heritage 2BHK, old city charm','Begumpet',2,21000,60000,1200,true,'Unfurnished','Anyone',false,true,false,0.6,10.2,990,'Immediate','{Lift,Parking}',78.4614,17.4435,'To-Let Board',9),
('New 2BHK, first occupancy','Manikonda',2,28500,90000,2000,false,'Semi Furnished','Anyone',true,true,false,5.2,3.4,1210,'20 Aug','{Lift,"Power Backup",Parking,Gym}',78.3838,17.4021,'Owner',21),
('Studio near Tank Bund','Himayatnagar',1,15500,50000,900,true,'Fully Furnished','Bachelor',false,false,false,0.8,12.1,620,'Immediate','{Lift,"Power Backup"}',78.4867,17.4009,'To-Let Board',5);