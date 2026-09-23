-- Keep city names canonical so the same city can never appear twice under a
-- different spelling (Bangalore vs Bengaluru), which would also break the
-- one-home-per-number-per-city rule.
create or replace function public.canonical_city(_city text)
returns text
language sql
immutable
set search_path = public
as $$
  select case lower(btrim(coalesce(_city, '')))
    when 'hyderabad' then 'Hyderabad'
    when 'hyd' then 'Hyderabad'
    when 'haidarabad' then 'Hyderabad'
    when 'bengaluru' then 'Bengaluru'
    when 'bangalore' then 'Bengaluru'
    when 'bengalooru' then 'Bengaluru'
    when 'blr' then 'Bengaluru'
    when 'chennai' then 'Chennai'
    when 'madras' then 'Chennai'
    when 'pune' then 'Pune'
    when 'poona' then 'Pune'
    when 'pcmc' then 'Pune'
    when 'pimpri chinchwad' then 'Pune'
    when 'visakhapatnam' then 'Visakhapatnam'
    when 'vizag' then 'Visakhapatnam'
    when 'vishakhapatnam' then 'Visakhapatnam'
    when 'visakapatnam' then 'Visakhapatnam'
    when 'waltair' then 'Visakhapatnam'
    else 'Hyderabad'
  end
$$;

revoke execute on function public.canonical_city(text) from public, anon, authenticated;
grant execute on function public.canonical_city(text) to service_role;

create or replace function public.normalize_listing_city()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.city := public.canonical_city(new.city);
  return new;
end;
$$;

drop trigger if exists normalize_listing_city_trg on public.listings;
create trigger normalize_listing_city_trg
before insert or update of city on public.listings
for each row execute function public.normalize_listing_city();

-- Clean up any existing rows before adding the constraint.
update public.listings set city = public.canonical_city(city)
where city is distinct from public.canonical_city(city);

alter table public.listings drop constraint if exists listings_city_check;
alter table public.listings add constraint listings_city_check
  check (city in ('Hyderabad','Bengaluru','Chennai','Pune','Visakhapatnam'));

create index if not exists listings_city_status_idx
  on public.listings (city, status);
