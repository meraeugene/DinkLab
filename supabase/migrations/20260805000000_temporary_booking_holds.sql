create extension if not exists btree_gist;

alter table public.bookings
  add column if not exists booking_hold_token uuid;

create table if not exists public.booking_holds (
  id uuid primary key default gen_random_uuid(),
  hold_token uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (end_at > start_at),
  check (expires_at > created_at)
);

create unique index if not exists booking_holds_slot_token_unique
on public.booking_holds (hold_token, court_id, start_at, end_at);

create index if not exists booking_holds_expiry_idx
on public.booking_holds (expires_at);

alter table public.booking_holds
  drop constraint if exists booking_holds_time_exclusion;

alter table public.booking_holds
  add constraint booking_holds_time_exclusion
  exclude using gist (
    court_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  );

alter table public.booking_holds enable row level security;

create or replace function public.acquire_booking_hold(
  p_user_id uuid,
  p_slots jsonb
)
returns table (
  hold_token uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_token uuid := gen_random_uuid();
  hold_until timestamptz := now() + interval '10 minutes';
begin
  if p_user_id is null
     or p_slots is null
     or jsonb_typeof(p_slots) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'invalid_booking_hold_request';
  end if;

  if jsonb_array_length(p_slots) < 1
     or jsonb_array_length(p_slots) > 40 then
    raise exception using errcode = '22023', message = 'invalid_booking_hold_request';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('booking-user:' || p_user_id::text, 0)
  );

  perform pg_advisory_xact_lock(
    hashtextextended('booking-court:' || locked_courts.court_id::text, 0)
  )
  from (
    select distinct requested.court_id
    from jsonb_to_recordset(p_slots) as requested(
      court_id uuid,
      start_at timestamptz,
      end_at timestamptz
    )
    union
    select existing.court_id
    from public.booking_holds existing
    where existing.user_id = p_user_id
  ) locked_courts
  order by locked_courts.court_id;

  delete from public.booking_holds expired
  where expired.expires_at <= now();

  delete from public.booking_holds previous
  where previous.user_id = p_user_id;

  if exists (
    select 1
    from jsonb_to_recordset(p_slots) as requested(
      court_id uuid,
      start_at timestamptz,
      end_at timestamptz
    )
    where requested.court_id is null
       or requested.start_at is null
       or requested.end_at is null
       or requested.end_at <= requested.start_at
       or requested.start_at <= now()
  ) or (
    select count(*)
    from jsonb_to_recordset(p_slots) as requested(
      court_id uuid,
      start_at timestamptz,
      end_at timestamptz
    )
  ) <> (
    select count(*)
    from (
      select distinct requested.court_id, requested.start_at, requested.end_at
      from jsonb_to_recordset(p_slots) as requested(
        court_id uuid,
        start_at timestamptz,
        end_at timestamptz
      )
    ) unique_slots
  ) then
    raise exception using errcode = '22023', message = 'invalid_booking_hold_request';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_slots) as requested(
      court_id uuid,
      start_at timestamptz,
      end_at timestamptz
    )
    join public.bookings booking
      on booking.court_id = requested.court_id
     and booking.status in ('PENDING_REVIEW', 'ACCEPTED')
     and booking.start_at < requested.end_at
     and booking.end_at > requested.start_at
  ) or exists (
    select 1
    from jsonb_to_recordset(p_slots) as requested(
      court_id uuid,
      start_at timestamptz,
      end_at timestamptz
    )
    join public.booking_holds active_hold
      on active_hold.court_id = requested.court_id
     and active_hold.expires_at > now()
     and active_hold.start_at < requested.end_at
     and active_hold.end_at > requested.start_at
  ) then
    raise exception using errcode = 'P0001', message = 'booking_hold_conflict';
  end if;

  insert into public.booking_holds (
    hold_token,
    user_id,
    court_id,
    start_at,
    end_at,
    expires_at
  )
  select
    next_token,
    p_user_id,
    requested.court_id,
    requested.start_at,
    requested.end_at,
    hold_until
  from jsonb_to_recordset(p_slots) as requested(
    court_id uuid,
    start_at timestamptz,
    end_at timestamptz
  );

  return query select next_token, hold_until;
exception
  when exclusion_violation or unique_violation then
    raise exception using errcode = 'P0001', message = 'booking_hold_conflict';
end;
$$;

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

  delete from public.booking_holds expired
  where expired.court_id = new.court_id
    and expired.expires_at <= now();

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

  if tg_op = 'INSERT'
     and new.status = 'PENDING_REVIEW'
     and new.user_id is not null then
    if new.booking_hold_token is null then
      raise exception using errcode = 'P0001', message = 'booking_hold_expired';
    end if;

    delete from public.booking_holds owned_hold
    where owned_hold.hold_token = new.booking_hold_token
      and owned_hold.user_id = new.user_id
      and owned_hold.court_id = new.court_id
      and owned_hold.start_at = new.start_at
      and owned_hold.end_at = new.end_at
      and owned_hold.expires_at > now();

    if not found then
      raise exception using errcode = 'P0001', message = 'booking_hold_expired';
    end if;
  elsif needs_conflict_check and exists (
    select 1
    from public.booking_holds active_hold
    where active_hold.court_id = new.court_id
      and active_hold.expires_at > now()
      and active_hold.start_at < new.end_at
      and active_hold.end_at > new.start_at
  ) then
    raise exception using errcode = 'P0001', message = 'booking_slot_held';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_enforce_slot_reservation on public.bookings;
create trigger bookings_enforce_slot_reservation
before insert or update on public.bookings
for each row execute function public.enforce_booking_slot_reservation();

revoke execute on function public.acquire_booking_hold(uuid, jsonb) from public;
revoke execute on function public.acquire_booking_hold(uuid, jsonb) from anon;
revoke execute on function public.acquire_booking_hold(uuid, jsonb) from authenticated;
grant execute on function public.acquire_booking_hold(uuid, jsonb) to service_role;
