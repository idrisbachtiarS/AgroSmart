-- AgroSmart database schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.farm_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  farm_name text not null,
  plant_name text not null,
  area_sqm numeric(12,2) check (area_sqm is null or area_sqm >= 0),
  planting_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.disease_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_name text,
  image_path text,
  predicted_disease text,
  confidence numeric(5,2),
  diagnosis_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.market_prices (
  id uuid primary key default gen_random_uuid(),
  commodity text not null,
  price_type text not null check (price_type in ('produsen','eceran')),
  price_per_kg numeric(14,2) not null check (price_per_kg >= 0),
  market_name text,
  province text,
  regency text,
  observed_at timestamptz not null,
  source_name text not null,
  source_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  summary text,
  body text,
  category text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists farm_records_user_created_idx on public.farm_records(user_id, created_at desc);
create index if not exists market_prices_filter_idx on public.market_prices(commodity, price_type, observed_at desc);
create index if not exists articles_published_idx on public.articles(published, published_at desc);

-- Create a profile automatically after a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.farm_records enable row level security;
alter table public.disease_history enable row level security;
alter table public.market_prices enable row level security;
alter table public.articles enable row level security;

-- Profiles: each user accesses only their own profile.
drop policy if exists "profile_select_own" on public.profiles;
create policy "profile_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Farm records: strictly owner-only.
drop policy if exists "farm_select_own" on public.farm_records;
create policy "farm_select_own" on public.farm_records for select to authenticated using (auth.uid() = user_id);
drop policy if exists "farm_insert_own" on public.farm_records;
create policy "farm_insert_own" on public.farm_records for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "farm_update_own" on public.farm_records;
create policy "farm_update_own" on public.farm_records for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "farm_delete_own" on public.farm_records;
create policy "farm_delete_own" on public.farm_records for delete to authenticated using (auth.uid() = user_id);

-- Disease history: strictly owner-only.
drop policy if exists "disease_select_own" on public.disease_history;
create policy "disease_select_own" on public.disease_history for select to authenticated using (auth.uid() = user_id);
drop policy if exists "disease_insert_own" on public.disease_history;
create policy "disease_insert_own" on public.disease_history for insert to authenticated with check (auth.uid() = user_id);

-- Market data: public read, no browser writes. Admin imports through trusted dashboard/backend.
drop policy if exists "market_prices_public_read" on public.market_prices;
create policy "market_prices_public_read" on public.market_prices for select to anon, authenticated using (true);

-- Articles: only published articles are public.
drop policy if exists "articles_public_read_published" on public.articles;
create policy "articles_public_read_published" on public.articles for select to anon, authenticated using (published = true);
