alter type public.booking_status add value if not exists 'REJECTED';

alter table public.bookings
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by_email text,
  add column if not exists review_reason text;

create index if not exists bookings_start_at_idx on public.bookings (start_at);

create table if not exists public.booking_settings (
  id boolean primary key default true,
  open_hour integer not null default 8,
  close_hour integer not null default 25,
  timezone text not null default 'Asia/Manila',
  updated_at timestamptz not null default now(),
  check (id = true),
  check (open_hour >= 0 and open_hour <= 24),
  check (close_hour > open_hour and close_hour <= 29)
);

insert into public.booking_settings (id, open_hour, close_hour, timezone)
values (true, 8, 25, 'Asia/Manila')
on conflict (id) do nothing;

drop trigger if exists booking_settings_touch_updated_at on public.booking_settings;
create trigger booking_settings_touch_updated_at
before update on public.booking_settings
for each row execute function public.touch_updated_at();

create table if not exists public.pricing_bands (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  start_hour integer not null,
  end_hour integer not null,
  hourly_rate integer not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_hour >= 0 and start_hour <= 28),
  check (end_hour > start_hour and end_hour <= 29),
  check (hourly_rate > 0)
);

insert into public.pricing_bands (label, start_hour, end_hour, hourly_rate, sort_order, active)
values
  ('Early', 8, 12, 150, 10, true),
  ('Day', 12, 15, 200, 20, true),
  ('Night', 15, 25, 300, 30, true)
on conflict do nothing;

drop trigger if exists pricing_bands_touch_updated_at on public.pricing_bands;
create trigger pricing_bands_touch_updated_at
before update on public.pricing_bands
for each row execute function public.touch_updated_at();

alter table public.booking_settings enable row level security;
alter table public.pricing_bands enable row level security;

drop policy if exists "Booking settings are public readable" on public.booking_settings;
create policy "Booking settings are public readable" on public.booking_settings
for select using (true);

drop policy if exists "Admins manage booking settings" on public.booking_settings;
create policy "Admins manage booking settings" on public.booking_settings
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Pricing bands are public readable" on public.pricing_bands;
create policy "Pricing bands are public readable" on public.pricing_bands
for select using (true);

drop policy if exists "Admins manage pricing bands" on public.pricing_bands;
create policy "Admins manage pricing bands" on public.pricing_bands
for all using (public.is_admin()) with check (public.is_admin());

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

  if exists (
    select 1
    from public.bookings b
    where b.id <> target.id
      and b.court_id = target.court_id
      and b.status = 'ACCEPTED'
      and b.start_at < target.end_at
      and b.end_at > target.start_at
  ) then
    return query
    select false, true, target.id, target.customer_name, target.user_email,
      target.start_at, target.end_at, target.total_amount,
      target.selected_court_name;
    return;
  end if;

  update public.bookings
  set status = 'ACCEPTED',
      accepted_at = now(),
      cancelled_at = null,
      reviewed_at = now()
  where id = target.id
    and status = 'PENDING_REVIEW';

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
