update public.pricing_bands
set active = false
where lower(label) = 'early';

update public.pricing_bands
set
  start_hour = 8,
  end_hour = 16,
  hourly_rate = 250,
  sort_order = 10,
  active = true
where lower(label) = 'day';

update public.pricing_bands
set
  start_hour = 16,
  end_hour = 25,
  hourly_rate = 300,
  sort_order = 20,
  active = true
where lower(label) = 'night';

insert into public.pricing_bands (label, start_hour, end_hour, hourly_rate, sort_order, active)
select 'Day', 8, 16, 250, 10, true
where not exists (
  select 1 from public.pricing_bands where lower(label) = 'day'
);

insert into public.pricing_bands (label, start_hour, end_hour, hourly_rate, sort_order, active)
select 'Night', 16, 25, 300, 20, true
where not exists (
  select 1 from public.pricing_bands where lower(label) = 'night'
);
