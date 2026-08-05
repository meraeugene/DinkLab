alter table public.bookings
  drop constraint if exists bookings_payment_proof_required_check;

-- Keep historical rows valid while requiring proof for every new online booking.
alter table public.bookings
  add constraint bookings_payment_proof_required_check
  check (
    payment_method = 'ONSITE'
    or (
      payment_proof_url is not null
      and payment_proof_public_id is not null
    )
  ) not valid;
