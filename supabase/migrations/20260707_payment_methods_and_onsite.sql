do $$
begin
  if to_regclass('public.admins') is null then
    create table public.admins (
      email text primary key,
      created_at timestamptz not null default now()
    );
  end if;
end $$;

insert into public.admins (email)
values
  ('gembangcaya29@gmail.com'),
  ('mandellaashafie1@gmail.com'),
  ('nifermalinao22@gmail.com'),
  ('andrewvillalon.dev@gmail.com')
on conflict (email) do nothing;

do $$
begin
  if exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'payment_method'
  ) and not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'payment_method_old'
  ) then
    alter type public.payment_method rename to payment_method_old;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'payment_method'
  ) then
    create type public.payment_method as enum ('BPI', 'GOTYME', 'ONSITE');
  end if;
end $$;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%payment_reference%'
      and pg_get_constraintdef(oid) ilike '%payment_proof%'
  loop
    execute format(
      'alter table public.bookings drop constraint if exists %I',
      constraint_name
    );
  end loop;
end $$;

alter table public.bookings
  add column if not exists downpayment_amount integer;

alter table public.bookings
  add column if not exists payment_proof_url text;

alter table public.bookings
  add column if not exists payment_proof_public_id text;

alter table public.bookings
  alter column payment_method drop default;

alter table public.bookings
  alter column payment_method type public.payment_method
  using (
    case payment_method::text
      when 'GCASH' then 'BPI'
      when 'BANK_TRANSFER' then 'BPI'
      when 'BPI' then 'BPI'
      when 'GOTYME' then 'GOTYME'
      when 'ONSITE' then 'ONSITE'
      else 'BPI'
    end
  )::public.payment_method;

update public.bookings
set downpayment_amount = coalesce(downpayment_amount, total_amount / 2)
where downpayment_amount is null;

alter table public.bookings
  alter column downpayment_amount set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and conname = 'bookings_downpayment_amount_positive_check'
  ) then
    alter table public.bookings
      add constraint bookings_downpayment_amount_positive_check
      check (downpayment_amount > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and conname = 'bookings_payment_proof_required_check'
  ) then
    alter table public.bookings
      add constraint bookings_payment_proof_required_check
      check (
        payment_method = 'ONSITE'
        or payment_reference is not null
        or payment_proof_url is not null
      );
  end if;
end $$;

drop type if exists public.payment_method_old;
