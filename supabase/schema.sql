create extension if not exists "pgcrypto";

drop table if exists public.blocked_slots cascade;
drop table if exists public.payments cascade;
drop table if exists public.bookings cascade;
drop type if exists payment_method cascade;
drop type if exists booking_status cascade;

do $$
begin
  create type booking_status as enum ('PENDING_REVIEW', 'ACCEPTED', 'CANCELLED');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type payment_method as enum ('BPI', 'GOTYME', 'ONSITE');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

insert into public.courts (id, name, description)
values
  ('00000000-0000-0000-0000-000000000001', 'Court 1', 'Indoor pickleball court'),
  ('00000000-0000-0000-0000-000000000002', 'Court 2', 'Indoor pickleball court')
on conflict (id) do update
set name = excluded.name,
    description = excluded.description;

create table if not exists public.admins (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into public.admins (email)
values
  ('gembangcaya29@gmail.com'),
  ('mandellaashafie1@gmail.com'),
  ('nifermalinao22@gmail.com'),
  ('andrewvillalon.dev@gmail.com')
on conflict (email) do nothing;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  customer_name text not null,
  customer_contact text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  hourly_rate integer not null check (hourly_rate > 0),
  total_amount integer not null check (total_amount > 0),
  downpayment_amount integer not null check (downpayment_amount > 0),
  payment_method payment_method not null,
  payment_reference text,
  payment_proof_url text,
  payment_proof_public_id text,
  status booking_status not null default 'PENDING_REVIEW',
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  check (
    payment_method = 'ONSITE'
    or payment_reference is not null
    or payment_proof_url is not null
  )
);

drop index if exists public.bookings_active_slot_unique;
drop index if exists public.bookings_accepted_slot_unique;
create unique index bookings_accepted_slot_unique
on public.bookings (court_id, start_at)
where status = 'ACCEPTED';

create index if not exists bookings_user_idx on public.bookings (user_id, start_at desc);
create index if not exists bookings_court_time_idx on public.bookings (court_id, start_at, end_at);
create index if not exists bookings_status_idx on public.bookings (status, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_touch_updated_at on public.bookings;
create trigger bookings_touch_updated_at
before update on public.bookings
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.courts enable row level security;
alter table public.admins enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "Courts are public" on public.courts;
create policy "Courts are public" on public.courts
for select using (true);

drop policy if exists "Users can read own bookings" on public.bookings;
create policy "Users can read own bookings" on public.bookings
for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can create own pending bookings" on public.bookings;
create policy "Users can create own pending bookings" on public.bookings
for insert with check (
  auth.uid() = user_id
  and status = 'PENDING_REVIEW'
);

drop policy if exists "Admins manage bookings" on public.bookings;
create policy "Admins manage bookings" on public.bookings
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can read admins" on public.admins;
create policy "Admins can read admins" on public.admins
for select using (public.is_admin());
