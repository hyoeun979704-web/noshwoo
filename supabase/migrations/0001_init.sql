-- NOSYU initial schema
-- Run against Supabase Postgres. Ordering matters for RLS + FKs.

create extension if not exists pgcrypto;
create extension if not exists vector;

-- =========================================================================
-- users (visitor profile, 1:1 with auth.users)
-- =========================================================================
create table if not exists public.users (
  id uuid primary key references auth.users on delete cascade,
  persona_tag text check (persona_tag in ('family','couple','solo')),
  interests text[] not null default '{}',
  visit_date date,
  referral_source text,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- partners (small business owners)
-- =========================================================================
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  business_name text not null,
  region_sigungu text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists partners_owner_idx on public.partners (owner_id);

-- =========================================================================
-- experiences (public tour data + partner-registered offerings)
-- =========================================================================
create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('tour_api','partner','seed')),
  partner_id uuid references public.partners on delete set null,
  title text not null,
  category text not null,
  is_indoor boolean not null,
  region_sigungu text not null,
  lat numeric(9,6),
  lng numeric(9,6),
  price_krw int,
  duration_min int,
  summary text,
  images text[] not null default '{}',
  external_booking_url text,
  embedding vector(768),
  popularity int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists experiences_region_indoor_idx
  on public.experiences (region_sigungu, is_indoor);
create index if not exists experiences_category_idx
  on public.experiences (category);
-- pgvector ANN index — build after first bulk insert for best recall.
create index if not exists experiences_embedding_idx
  on public.experiences using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- =========================================================================
-- bookings
-- =========================================================================
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  experience_id uuid not null references public.experiences on delete restrict,
  visit_at timestamptz not null,
  status text not null default 'confirmed'
    check (status in ('confirmed','cancelled','completed')),
  created_at timestamptz not null default now()
);
create index if not exists bookings_user_idx on public.bookings (user_id);
create index if not exists bookings_experience_idx on public.bookings (experience_id);

-- =========================================================================
-- reviews
-- =========================================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  experience_id uuid not null references public.experiences on delete cascade,
  rating int not null check (rating between 1 and 5),
  content text,
  sentiment text check (sentiment in ('pos','neu','neg')),
  created_at timestamptz not null default now()
);
create index if not exists reviews_experience_idx on public.reviews (experience_id);

-- =========================================================================
-- weather_cache  (service_role only; also stores demo override rows)
-- =========================================================================
create table if not exists public.weather_cache (
  cache_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  ttl_minutes int not null default 60
);

-- =========================================================================
-- recommendations log
-- =========================================================================
create table if not exists public.recommendations (
  id bigserial primary key,
  user_id uuid references public.users on delete set null,
  context jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists recommendations_user_idx on public.recommendations (user_id);

-- =========================================================================
-- Row-Level Security
-- =========================================================================
alter table public.users enable row level security;
drop policy if exists users_self on public.users;
create policy users_self on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

alter table public.partners enable row level security;
drop policy if exists partners_owner on public.partners;
create policy partners_owner on public.partners
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table public.experiences enable row level security;
drop policy if exists experiences_read_all on public.experiences;
create policy experiences_read_all on public.experiences
  for select using (true);
drop policy if exists experiences_partner_insert on public.experiences;
create policy experiences_partner_insert on public.experiences
  for insert with check (
    source = 'partner'
    and partner_id in (select id from public.partners where owner_id = auth.uid())
  );
drop policy if exists experiences_partner_update on public.experiences;
create policy experiences_partner_update on public.experiences
  for update using (
    partner_id in (select id from public.partners where owner_id = auth.uid())
  );

alter table public.bookings enable row level security;
drop policy if exists bookings_self on public.bookings;
create policy bookings_self on public.bookings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.reviews enable row level security;
drop policy if exists reviews_read_all on public.reviews;
create policy reviews_read_all on public.reviews for select using (true);
drop policy if exists reviews_write_self on public.reviews;
create policy reviews_write_self on public.reviews
  for insert with check (user_id = auth.uid());
drop policy if exists reviews_update_self on public.reviews;
create policy reviews_update_self on public.reviews
  for update using (user_id = auth.uid());

-- weather_cache and recommendations: service_role only (RLS on, no policies).
alter table public.weather_cache enable row level security;
alter table public.recommendations enable row level security;
