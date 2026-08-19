-- Dink Lab consolidated Supabase schema.
-- WARNING: This is a destructive reset. Running the whole file deletes all
-- application booking, court, settings, pricing, and admin data before seeding
-- the required defaults. Supabase Auth users are not deleted.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

drop table if exists public.blocked_slots cascade;
drop table if exists public.payments cascade;
drop table if exists public.booking_holds cascade;
drop table if exists public.bookings cascade;
drop table if exists public.pricing_bands cascade;
drop table if exists public.booking_settings cascade;
drop table if exists public.courts cascade;
drop table if exists public.admins cascade;

drop function if exists public.acquire_booking_hold(uuid, jsonb);
drop function if exists public.reschedule_accepted_booking_group(uuid, jsonb, text);
drop function if exists public.accept_pending_booking(uuid);
drop function if exists public.enforce_booking_slot_reservation();
drop function if exists public.touch_updated_at();
drop function if exists public.is_admin();

drop type if exists public.payment_method cascade;
drop type if exists public.booking_status cascade;

create type public.booking_status as enum (
  'PENDING_REVIEW',
  'ACCEPTED',
  'CANCELLED',
  'REJECTED'
);

create type public.payment_method as enum ('BPI', 'GOTYME', 'ONSITE');

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
  booking_group_id uuid not null default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete restrict,
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  customer_name text not null,
  customer_avatar_url text,
  customer_contact text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  hourly_rate integer not null,
  total_amount integer not null,
  downpayment_amount integer not null,
  payment_method public.payment_method not null,
  payment_status text not null default 'UNVERIFIED',
  payment_reference text,
  payment_proof_url text,
  payment_proof_public_id text,
  status public.booking_status not null default 'PENDING_REVIEW',
  accepted_at timestamptz,
  cancelled_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by_email text,
  review_reason text,
  reminder_sent_at timestamptz,
  reminder_email_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_time_range_check check (end_at > start_at),
  constraint bookings_hourly_rate_check check (hourly_rate > 0),
  constraint bookings_total_amount_check check (total_amount > 0),
  constraint bookings_downpayment_amount_check check (downpayment_amount >= 0),
  constraint bookings_payment_status_check check (
    payment_status in ('PAID', 'HALF_PAID', 'UNPAID', 'UNVERIFIED')
  ),
  constraint bookings_payment_proof_required_check check (
    payment_method = 'ONSITE'
    or (
      payment_proof_url is not null
      and payment_proof_public_id is not null
    )
  )
);

drop index if exists public.bookings_active_slot_unique;
drop index if exists public.bookings_accepted_slot_unique;
create unique index bookings_accepted_slot_unique
on public.bookings (court_id, start_at)
where status = 'ACCEPTED';

create index if not exists bookings_user_idx on public.bookings (user_id, start_at desc);
create index if not exists bookings_group_idx on public.bookings (booking_group_id, created_at);
create index if not exists bookings_court_time_idx on public.bookings (court_id, start_at, end_at);
create index if not exists bookings_status_idx on public.bookings (status, created_at desc);
create index if not exists bookings_start_at_idx on public.bookings (start_at);
create index if not exists bookings_reminder_due_idx
on public.bookings (status, reminder_sent_at, start_at)
where status = 'ACCEPTED';

alter table public.bookings
  drop constraint if exists bookings_accepted_time_exclusion;

alter table public.bookings
  add constraint bookings_accepted_time_exclusion
  exclude using gist (
    court_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (status = 'ACCEPTED');

alter table public.bookings replica identity default;

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bookings'
  ) then
    alter publication supabase_realtime drop table public.bookings;
  end if;
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

create or replace function public.enforce_booking_slot_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  needs_conflict_check boolean;
begin
  if new.status not in ('PENDING_REVIEW', 'ACCEPTED') then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('booking-court:' || new.court_id::text, 0)
  );

  needs_conflict_check := tg_op = 'INSERT';
  if tg_op = 'UPDATE' then
    needs_conflict_check :=
      old.status not in ('PENDING_REVIEW', 'ACCEPTED')
      or old.court_id is distinct from new.court_id
      or old.start_at is distinct from new.start_at
      or old.end_at is distinct from new.end_at;
  end if;

  if needs_conflict_check and exists (
    select 1
    from public.bookings existing
    where existing.id <> new.id
      and existing.court_id = new.court_id
      and existing.status in ('PENDING_REVIEW', 'ACCEPTED')
      and existing.start_at < new.end_at
      and existing.end_at > new.start_at
  ) then
    raise exception using errcode = 'P0001', message = 'booking_slot_conflict';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_enforce_slot_reservation on public.bookings;
create trigger bookings_enforce_slot_reservation
before insert or update on public.bookings
for each row execute function public.enforce_booking_slot_reservation();

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
  ('Morning', 8, 12, 200, 10, true),
  ('Afternoon', 12, 16, 250, 20, true),
  ('Evening', 16, 25, 300, 30, true)
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

  perform pg_advisory_xact_lock(
    hashtextextended(target.booking_group_id::text, 0)
  );

  perform 1
  from public.bookings b
  where b.booking_group_id = target.booking_group_id
    and b.status = 'PENDING_REVIEW'
  for update;

  if exists (
    select 1
    from public.bookings pending
    join public.bookings reserved
      on reserved.court_id = pending.court_id
     and reserved.status = 'ACCEPTED'
     and reserved.booking_group_id <> target.booking_group_id
     and reserved.start_at < pending.end_at
     and reserved.end_at > pending.start_at
    where pending.booking_group_id = target.booking_group_id
      and pending.status = 'PENDING_REVIEW'
  ) then
    return query
    select false, true, target.id, target.customer_name, target.user_email,
      target.start_at, target.end_at, target.total_amount,
      target.selected_court_name;
    return;
  end if;

  begin
    update public.bookings
    set status = 'ACCEPTED',
        accepted_at = now(),
        cancelled_at = null,
        reviewed_at = now()
    where booking_group_id = target.booking_group_id
      and status = 'PENDING_REVIEW';
  exception
    when exclusion_violation or unique_violation then
      return query
      select false, true, target.id, target.customer_name, target.user_email,
        target.start_at, target.end_at, target.total_amount,
        target.selected_court_name;
      return;
  end;

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

create or replace function public.reschedule_accepted_booking_group(
  p_booking_id uuid,
  p_slots jsonb,
  p_reviewed_by_email text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group_id uuid;
  requested record;
  updated_count integer := 0;
begin
  if p_slots is null or jsonb_typeof(p_slots) <> 'array' then
    raise exception using errcode = 'P0001', message = 'invalid_reschedule_slots';
  end if;

  if jsonb_array_length(p_slots) < 1 then
    raise exception using errcode = 'P0001', message = 'invalid_reschedule_slots';
  end if;

  select booking_group_id
  into target_group_id
  from public.bookings
  where id = p_booking_id
    and status = 'ACCEPTED'
  for update;

  if target_group_id is null then
    raise exception using errcode = 'P0001', message = 'booking_not_reschedulable';
  end if;

  perform 1
  from public.bookings
  where booking_group_id = target_group_id
    and status = 'ACCEPTED'
  for update;

  if jsonb_array_length(p_slots) < (
    select count(*)
    from public.bookings
    where booking_group_id = target_group_id
      and status = 'ACCEPTED'
  ) then
    raise exception using errcode = 'P0001', message = 'reschedule_slot_set_changed';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_slots) as slot(id uuid)
    group by slot.id
    having count(*) > 1
  ) or exists (
    select 1
    from public.bookings booking
    where booking.booking_group_id = target_group_id
      and booking.status = 'ACCEPTED'
      and not exists (
        select 1
        from jsonb_to_recordset(p_slots) as slot(id uuid)
        where slot.id = booking.id
      )
  ) or exists (
    select 1
    from jsonb_to_recordset(p_slots) as slot(id uuid)
    join public.bookings booking on booking.id = slot.id
    where booking.booking_group_id <> target_group_id
       or booking.status <> 'ACCEPTED'
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_reschedule_slots';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_slots) as first_slot(
      id uuid,
      court_id uuid,
      start_at timestamptz,
      end_at timestamptz
    )
    join jsonb_to_recordset(p_slots) as second_slot(
      id uuid,
      court_id uuid,
      start_at timestamptz,
      end_at timestamptz
    )
      on first_slot.id < second_slot.id
      and first_slot.court_id = second_slot.court_id
      and first_slot.start_at < second_slot.end_at
      and first_slot.end_at > second_slot.start_at
  ) then
    raise exception using errcode = 'P0001', message = 'reschedule_slots_overlap';
  end if;

  update public.bookings
  set status = 'CANCELLED'
  where booking_group_id = target_group_id
    and status = 'ACCEPTED';

  for requested in
    select *
    from jsonb_to_recordset(p_slots) as slot(
      id uuid,
      court_id uuid,
      start_at timestamptz,
      end_at timestamptz,
      hourly_rate integer,
      total_amount integer,
      downpayment_amount integer
    )
  loop
    update public.bookings
    set
      court_id = requested.court_id,
      start_at = requested.start_at,
      end_at = requested.end_at,
      hourly_rate = requested.hourly_rate,
      total_amount = requested.total_amount,
      downpayment_amount = requested.downpayment_amount,
      status = 'ACCEPTED',
      cancelled_at = null,
      reviewed_at = now(),
      reviewed_by_email = p_reviewed_by_email,
      review_reason = 'Accepted reservation rescheduled manually by admin.',
      updated_at = now()
    where id = requested.id
      and booking_group_id = target_group_id;

    if not found then
      insert into public.bookings (
        id,
        booking_group_id,
        court_id,
        user_id,
        user_email,
        customer_name,
        customer_avatar_url,
        customer_contact,
        start_at,
        end_at,
        hourly_rate,
        total_amount,
        downpayment_amount,
        payment_method,
        payment_status,
        payment_reference,
        payment_proof_url,
        payment_proof_public_id,
        status,
        accepted_at,
        reviewed_at,
        reviewed_by_email,
        review_reason,
        created_at,
        updated_at
      )
      select
        requested.id,
        target_group_id,
        requested.court_id,
        template.user_id,
        template.user_email,
        template.customer_name,
        template.customer_avatar_url,
        template.customer_contact,
        requested.start_at,
        requested.end_at,
        requested.hourly_rate,
        requested.total_amount,
        requested.downpayment_amount,
        template.payment_method,
        template.payment_status,
        template.payment_reference,
        template.payment_proof_url,
        template.payment_proof_public_id,
        'ACCEPTED',
        coalesce(template.accepted_at, now()),
        now(),
        p_reviewed_by_email,
        'Accepted reservation rescheduled manually by admin.',
        now(),
        now()
      from public.bookings template
      where template.id = p_booking_id;

      if not found then
        raise exception using errcode = 'P0001', message = 'reschedule_slot_set_changed';
      end if;
    end if;

    updated_count := updated_count + 1;
  end loop;

  return updated_count;
end;
$$;

revoke execute on function public.reschedule_accepted_booking_group(uuid, jsonb, text) from public;
revoke execute on function public.reschedule_accepted_booking_group(uuid, jsonb, text) from anon;
revoke execute on function public.reschedule_accepted_booking_group(uuid, jsonb, text) from authenticated;
grant execute on function public.reschedule_accepted_booking_group(uuid, jsonb, text) to service_role;
