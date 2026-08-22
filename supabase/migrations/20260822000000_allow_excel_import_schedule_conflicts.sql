-- Temporarily allow Excel-imported reservations to overlap existing schedule
-- rows while retaining conflict protection for customer and onsite bookings.

alter table public.bookings
  drop constraint if exists bookings_accepted_time_exclusion;

alter table public.bookings
  add constraint bookings_accepted_time_exclusion
  exclude using gist (
    court_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (
    status = 'ACCEPTED'
    and not (
      user_id is null
      and user_email = 'booking-list@dinklab.local'
      and customer_contact = 'EXCEL_IMPORT'
    )
  );

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

  if new.user_id is null
    and new.user_email = 'booking-list@dinklab.local'
    and new.customer_contact = 'EXCEL_IMPORT'
  then
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
