create extension if not exists btree_gist;

alter table public.bookings
  add column if not exists booking_group_id uuid;

update public.bookings
set booking_group_id = gen_random_uuid()
where booking_group_id is null;

alter table public.bookings
  alter column booking_group_id set default gen_random_uuid(),
  alter column booking_group_id set not null;

create index if not exists bookings_group_idx
on public.bookings (booking_group_id, created_at);

alter table public.bookings
  drop constraint if exists bookings_accepted_time_exclusion;

alter table public.bookings
  add constraint bookings_accepted_time_exclusion
  exclude using gist (
    court_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (status = 'ACCEPTED');

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
