alter table public.bookings
  alter column user_id drop not null;

alter table public.bookings
  drop constraint if exists bookings_downpayment_amount_check;

alter table public.bookings
  add constraint bookings_downpayment_amount_check
  check (downpayment_amount >= 0);

alter table public.bookings
  add column if not exists payment_status text not null default 'UNVERIFIED';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_payment_status_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_payment_status_check
      check (payment_status in ('PAID', 'HALF_PAID', 'UNPAID', 'UNVERIFIED'));
  end if;
end $$;
