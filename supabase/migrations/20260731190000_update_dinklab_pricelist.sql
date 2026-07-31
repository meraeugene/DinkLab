update public.pricing_bands
set active = false;

insert into public.pricing_bands (
  label,
  start_hour,
  end_hour,
  hourly_rate,
  sort_order,
  active
)
values
  ('Morning', 8, 12, 200, 10, true),
  ('Afternoon', 12, 16, 250, 20, true),
  ('Evening', 16, 25, 300, 30, true);
