create extension if not exists "pgcrypto";

drop table if exists public.blocked_slots cascade;
drop table if exists public.pricing_bands cascade;
drop table if exists public.booking_settings cascade;
drop table if exists public.payments cascade;
drop table if exists public.bookings cascade;
drop type if exists payment_method cascade;
drop type if exists booking_status cascade;

do $$
begin
  create type booking_status as enum ('PENDING_REVIEW', 'ACCEPTED', 'CANCELLED', 'REJECTED');
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
  ('00000000-0000-0000-0000-000000000001', 'Court 1', 'Indoor'),
  ('00000000-0000-0000-0000-000000000002', 'Court 2', 'Indoor')
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
  customer_avatar_url text,
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
  reviewed_at timestamptz,
  reviewed_by_email text,
  review_reason text,
  reminder_sent_at timestamptz,
  reminder_email_error text,
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
create index if not exists bookings_start_at_idx on public.bookings (start_at);
create index if not exists bookings_reminder_due_idx
on public.bookings (status, reminder_sent_at, start_at)
where status = 'ACCEPTED';

alter table public.bookings replica identity default;

do $$
begin
  alter publication supabase_realtime drop table public.bookings;
exception
  when undefined_object then null;
end $$;

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

create table if not exists public.booking_settings (
  id boolean primary key default true,
  open_hour integer not null default 8,
  close_hour integer not null default 25,
  timezone text not null default 'Asia/Manila',
  updated_at timestamptz not null default now(),
  check (id = true),
  check (open_hour >= 0 and open_hour <= 24),
  check (close_hour > open_hour and close_hour <= 29)
);

insert into public.booking_settings (id, open_hour, close_hour, timezone)
values (true, 8, 25, 'Asia/Manila')
on conflict (id) do update
set open_hour = excluded.open_hour,
    close_hour = excluded.close_hour,
    timezone = excluded.timezone;

drop trigger if exists booking_settings_touch_updated_at on public.booking_settings;
create trigger booking_settings_touch_updated_at
before update on public.booking_settings
for each row execute function public.touch_updated_at();

create table if not exists public.pricing_bands (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  start_hour integer not null,
  end_hour integer not null,
  hourly_rate integer not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_hour >= 0 and start_hour <= 28),
  check (end_hour > start_hour and end_hour <= 29),
  check (hourly_rate > 0)
);

insert into public.pricing_bands (label, start_hour, end_hour, hourly_rate, sort_order, active)
values
  ('Day', 8, 16, 250, 10, true),
  ('Night', 16, 25, 300, 20, true)
on conflict do nothing;

drop trigger if exists pricing_bands_touch_updated_at on public.pricing_bands;
create trigger pricing_bands_touch_updated_at
before update on public.pricing_bands
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
alter table public.booking_settings enable row level security;
alter table public.pricing_bands enable row level security;

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

drop policy if exists "Booking settings are public readable" on public.booking_settings;
create policy "Booking settings are public readable" on public.booking_settings
for select using (true);

drop policy if exists "Admins manage booking settings" on public.booking_settings;
create policy "Admins manage booking settings" on public.booking_settings
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Pricing bands are public readable" on public.pricing_bands;
create policy "Pricing bands are public readable" on public.pricing_bands
for select using (true);

drop policy if exists "Admins manage pricing bands" on public.pricing_bands;
create policy "Admins manage pricing bands" on public.pricing_bands
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can read admins" on public.admins;
create policy "Admins can read admins" on public.admins
for select using (public.is_admin());

create or replace function public.accept_pending_booking(target_booking_id uuid)
returns table (
  accepted boolean,
  conflict boolean,
  booking_id uuid,
  customer_name text,
  user_email text,
  start_at timestamptz,
  end_at timestamptz,
  total_amount integer,
  court_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
begin
  select b.*, c.name as selected_court_name
  into target
  from public.bookings b
  join public.courts c on c.id = b.court_id
  where b.id = target_booking_id
  for update;

  if not found or target.status <> 'PENDING_REVIEW' then
    return;
  end if;

  if exists (
    select 1
    from public.bookings b
    where b.id <> target.id
      and b.court_id = target.court_id
      and b.status = 'ACCEPTED'
      and b.start_at < target.end_at
      and b.end_at > target.start_at
  ) then
    return query
    select false, true, target.id, target.customer_name, target.user_email,
      target.start_at, target.end_at, target.total_amount,
      target.selected_court_name;
    return;
  end if;

  update public.bookings
  set status = 'ACCEPTED',
      accepted_at = now(),
      cancelled_at = null,
      reviewed_at = now()
  where id = target.id
    and status = 'PENDING_REVIEW';

  return query
  select true, false, target.id, target.customer_name, target.user_email,
    target.start_at, target.end_at, target.total_amount,
    target.selected_court_name;
end;
$$;

revoke execute on function public.accept_pending_booking(uuid) from public;
revoke execute on function public.accept_pending_booking(uuid) from anon;
revoke execute on function public.accept_pending_booking(uuid) from authenticated;
grant execute on function public.accept_pending_booking(uuid) to service_role;
