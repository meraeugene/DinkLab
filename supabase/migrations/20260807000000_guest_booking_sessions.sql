-- Allow Supabase anonymous users to own bookings without supplying an email.
-- Enable Anonymous Sign-Ins in Supabase Auth before deploying the guest flow.

alter table public.bookings
  alter column user_email drop not null;
