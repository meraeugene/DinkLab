-- Non-destructive migration for recording additional booking payments.
create or replace function public.add_booking_group_payment(
  p_booking_id uuid,
  p_additional_amount integer default 0,
  p_mark_fully_paid boolean default false
)
returns table (
  amount_paid integer,
  total_amount integer,
  payment_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_total integer;
  v_current_paid integer;
  v_new_paid integer;
  v_status text;
  v_allocated integer := 0;
  v_cumulative_total integer := 0;
  v_row_amount integer;
  v_row record;
begin
  select booking_group_id
  into v_group_id
  from public.bookings
  where id = p_booking_id
    and status in ('PENDING_REVIEW', 'ACCEPTED');

  if v_group_id is null then
    raise exception using errcode = 'P0001', message = 'booking_payment_not_updatable';
  end if;

  perform 1
  from public.bookings
  where booking_group_id = v_group_id
    and status in ('PENDING_REVIEW', 'ACCEPTED')
  for update;

  select
    coalesce(sum(b.total_amount), 0)::integer,
    coalesce(sum(b.downpayment_amount), 0)::integer
  into v_total, v_current_paid
  from public.bookings b
  where b.booking_group_id = v_group_id
    and b.status in ('PENDING_REVIEW', 'ACCEPTED');

  if v_total <= 0 then
    raise exception using errcode = 'P0001', message = 'booking_payment_not_updatable';
  end if;
  if v_current_paid >= v_total then
    raise exception using errcode = 'P0001', message = 'booking_already_fully_paid';
  end if;

  if p_mark_fully_paid then
    v_new_paid := v_total;
  else
    if p_additional_amount is null or p_additional_amount <= 0 then
      raise exception using errcode = 'P0001', message = 'booking_payment_amount_invalid';
    end if;
    v_new_paid := v_current_paid + p_additional_amount;
  end if;

  if v_new_paid > v_total then
    raise exception using errcode = 'P0001', message = 'booking_payment_exceeds_balance';
  end if;

  v_status := case
    when v_new_paid >= v_total then 'PAID'
    when v_new_paid > 0 then 'HALF_PAID'
    else 'UNPAID'
  end;

  for v_row in
    select
      b.id,
      b.total_amount
    from public.bookings b
    where b.booking_group_id = v_group_id
      and b.status in ('PENDING_REVIEW', 'ACCEPTED')
    order by b.start_at, b.id
  loop
    v_cumulative_total := v_cumulative_total + v_row.total_amount;
    v_row_amount :=
      round(v_new_paid::numeric * v_cumulative_total / v_total)::integer
      - v_allocated;

    update public.bookings
    set downpayment_amount = v_row_amount,
        payment_status = v_status
    where id = v_row.id;

    v_allocated := v_allocated + v_row_amount;
  end loop;

  return query select v_new_paid, v_total, v_status;
end;
$$;

revoke execute on function public.add_booking_group_payment(uuid, integer, boolean) from public;
revoke execute on function public.add_booking_group_payment(uuid, integer, boolean) from anon;
revoke execute on function public.add_booking_group_payment(uuid, integer, boolean) from authenticated;
grant execute on function public.add_booking_group_payment(uuid, integer, boolean) to service_role;
