create or replace function public.sync_accepted_booking_payment_status()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'ACCEPTED' then
    new.payment_status := case
      when new.downpayment_amount >= new.total_amount then 'PAID'
      when new.downpayment_amount > 0 then 'HALF_PAID'
      else 'UNPAID'
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_sync_accepted_payment_status on public.bookings;
create trigger bookings_sync_accepted_payment_status
before insert or update of status, total_amount, downpayment_amount on public.bookings
for each row execute function public.sync_accepted_booking_payment_status();

update public.bookings
set payment_status = case
  when downpayment_amount >= total_amount then 'PAID'
  when downpayment_amount > 0 then 'HALF_PAID'
  else 'UNPAID'
end
where status = 'ACCEPTED'
  and payment_status is distinct from case
    when downpayment_amount >= total_amount then 'PAID'
    when downpayment_amount > 0 then 'HALF_PAID'
    else 'UNPAID'
  end;
