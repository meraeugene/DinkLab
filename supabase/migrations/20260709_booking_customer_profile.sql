alter table public.bookings
  add column if not exists customer_avatar_url text;
