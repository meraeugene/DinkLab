alter table public.bookings replica identity default;

do $$
begin
  alter publication supabase_realtime drop table public.bookings;
exception
  when undefined_object then null;
end $$;
