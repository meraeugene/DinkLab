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
        booking_hold_token,
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
        template.booking_hold_token,
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
