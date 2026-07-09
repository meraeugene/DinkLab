-- Dink Lab multiple test data
-- Intended for local/dev/test Supabase projects only.
--
-- What this does when run as-is:
-- 1. Deletes only tagged Dink Lab load-test data.
-- 2. Reuses existing Supabase Auth users as booking owners.
-- 3. Inserts about 5,000 tagged bookings across statuses and payment methods.
-- 4. Prints summary counts.
-- 5. Provides optional performance and RLS/security probes.
--
-- Recommended setup:
-- - Run supabase/schema.sql first if the database is empty.
-- - Create at least two test users through Supabase Auth before running this.
-- - Do not run this in production.

create extension if not exists "pgcrypto";

begin;

-- Keep reruns deterministic and safe by deleting only tagged test data.
delete from public.bookings
where user_email like 'dinklab-load-%@example.test'
   or payment_reference like 'DL-LOAD-%'
   or payment_proof_public_id like 'dinklab/load-tests/%';

delete from public.admins
where email = 'dinklab-load-admin@example.test';

do $$
declare
  auth_user_count integer;
begin
  select count(*) into auth_user_count
  from auth.users
  where deleted_at is null;

  if auth_user_count < 2 then
    raise exception
      'Dink Lab load-test SQL needs at least 2 existing Supabase Auth users. Create test users through Supabase Auth, then rerun this file.';
  end if;
end $$;

insert into public.admins (email)
values ('dinklab-load-admin@example.test')
on conflict (email) do nothing;

with constants as (
  select
    date '2035-07-15' as first_booking_date,
    5000::integer as booking_count,
    1600::integer as accepted_count,
    array[
      '00000000-0000-0000-0000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000002'::uuid
    ] as court_ids,
    array[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] as hours
),
auth_user_pool as (
  select
    row_number() over (order by created_at, id) as pool_index,
    count(*) over () as pool_count,
    id
  from auth.users
  where deleted_at is null
),
customer_users as (
  select
    generated_users.n,
    auth_user_pool.id,
    'dinklab-load-user-' || lpad(n::text, 3, '0') || '@example.test' as email,
    'Load Player ' || lpad(n::text, 3, '0') as full_name,
    '+63917' || lpad((7000000 + n)::text, 7, '0') as contact
  from generate_series(1, 120) as generated_users(n)
  join auth_user_pool
    on auth_user_pool.pool_index = ((generated_users.n - 1) % auth_user_pool.pool_count) + 1
),
accepted_slots as (
  select
    row_number() over (order by day_index, court_index, start_hour) as rn,
    court_ids[court_index] as court_id,
    ((first_booking_date + day_index) + make_interval(hours => start_hour)) at time zone 'Asia/Manila' as start_at,
    ((first_booking_date + day_index) + make_interval(hours => start_hour + 1)) at time zone 'Asia/Manila' as end_at,
    start_hour
  from constants
  cross join generate_series(0, 80) as day_index
  cross join generate_series(1, 2) as court_index
  cross join unnest(hours) as start_hour
),
accepted_bookings as (
  select
    rn as seq,
    court_id,
    start_at,
    end_at,
    start_hour,
    'ACCEPTED'::booking_status as status
  from accepted_slots, constants
  where rn <= accepted_count
),
non_accepted_bookings as (
  select
    constants.accepted_count + gs as seq,
    case
      when gs <= 450 then accepted_bookings.court_id
      else constants.court_ids[((gs % 2) + 1)]
    end as court_id,
    case
      when gs <= 450 then accepted_bookings.start_at
      else ((constants.first_booking_date + ((gs / 34)::integer % 120)) + make_interval(hours => constants.hours[((gs % array_length(constants.hours, 1)) + 1)])) at time zone 'Asia/Manila'
    end as start_at,
    case
      when gs <= 450 then accepted_bookings.end_at
      else ((constants.first_booking_date + ((gs / 34)::integer % 120)) + make_interval(hours => constants.hours[((gs % array_length(constants.hours, 1)) + 1)] + 1)) at time zone 'Asia/Manila'
    end as end_at,
    case
      when gs <= 450 then accepted_bookings.start_hour
      else constants.hours[((gs % array_length(constants.hours, 1)) + 1)]
    end as start_hour,
    case
      when gs % 10 in (0, 1, 2, 3, 4) then 'PENDING_REVIEW'
      when gs % 10 in (5, 6, 7) then 'CANCELLED'
      else 'REJECTED'
    end::booking_status as status
  from constants
  cross join generate_series(1, constants.booking_count - constants.accepted_count) as gs
  left join accepted_bookings on accepted_bookings.seq = ((gs - 1) % constants.accepted_count) + 1
),
all_bookings as (
  select * from accepted_bookings
  union all
  select * from non_accepted_bookings
),
booking_payload as (
  select
    gen_random_uuid() as id,
    all_bookings.seq,
    all_bookings.court_id,
    customer_users.id as user_id,
    customer_users.email as user_email,
    customer_users.full_name as customer_name,
    'https://api.dicebear.com/9.x/initials/svg?seed=' || replace(customer_users.full_name, ' ', '%20') as customer_avatar_url,
    customer_users.contact as customer_contact,
    all_bookings.start_at,
    all_bookings.end_at,
    case
      when all_bookings.start_hour < 12 then 150
      when all_bookings.start_hour < 15 then 200
      else 300
    end as hourly_rate,
    case
      when all_bookings.seq % 3 = 0 then 'ONSITE'
      when all_bookings.seq % 3 = 1 then 'BPI'
      else 'GOTYME'
    end::payment_method as payment_method,
    all_bookings.status,
    now()
      - ((all_bookings.seq % 45)::integer * interval '1 day')
      - ((all_bookings.seq % 60)::integer * interval '1 minute') as created_at
  from all_bookings
  join customer_users on customer_users.n = ((all_bookings.seq - 1) % 120) + 1
)
insert into public.bookings (
  id,
  court_id,
  user_id,
  user_email,
  customer_name,
  customer_avatar_url,
  customer_contact,
  start_at,
  end_at,
  hourly_rate,
  total_amount,
  downpayment_amount,
  payment_method,
  payment_reference,
  payment_proof_url,
  payment_proof_public_id,
  status,
  accepted_at,
  cancelled_at,
  reviewed_at,
  reviewed_by_email,
  review_reason,
  reminder_sent_at,
  reminder_email_error,
  created_at,
  updated_at
)
select
  id,
  court_id,
  user_id,
  user_email,
  customer_name,
  customer_avatar_url,
  customer_contact,
  start_at,
  end_at,
  hourly_rate,
  hourly_rate as total_amount,
  greatest(1, hourly_rate / 2)::integer as downpayment_amount,
  payment_method,
  case
    when payment_method = 'ONSITE' then null
    else 'DL-LOAD-' || lpad(seq::text, 5, '0')
  end as payment_reference,
  case
    when payment_method = 'ONSITE' then null
    else 'https://res.cloudinary.com/demo/image/upload/v1/dinklab/load-tests/payment-proof-' || lpad(seq::text, 5, '0') || '.jpg'
  end as payment_proof_url,
  case
    when payment_method = 'ONSITE' then null
    else 'dinklab/load-tests/payment-proof-' || lpad(seq::text, 5, '0')
  end as payment_proof_public_id,
  status,
  case when status = 'ACCEPTED' then now() - interval '1 day' else null end as accepted_at,
  case when status = 'CANCELLED' then now() - interval '12 hours' else null end as cancelled_at,
  case when status in ('ACCEPTED', 'CANCELLED', 'REJECTED') then now() - interval '1 day' else null end as reviewed_at,
  case when status in ('ACCEPTED', 'CANCELLED', 'REJECTED') then 'dinklab-load-admin@example.test' else null end as reviewed_by_email,
  case
    when status = 'REJECTED' then 'Load-test rejected booking.'
    when status = 'CANCELLED' then 'Load-test customer cancellation.'
    else null
  end as review_reason,
  case when status = 'ACCEPTED' and seq % 4 = 0 then now() - interval '2 hours' else null end as reminder_sent_at,
  null as reminder_email_error,
  created_at,
  created_at
from booking_payload;

commit;

-- Summary counts.
select 'load_test_customer_profiles' as metric, count(distinct user_email) as value
from public.bookings
where user_email like 'dinklab-load-%@example.test';

select 'source_auth_users_used' as metric, count(distinct user_id) as value
from public.bookings
where user_email like 'dinklab-load-%@example.test';

select status::text as booking_status, count(*) as value
from public.bookings
where user_email like 'dinklab-load-%@example.test'
group by status
order by status;

select payment_method::text as payment_method, count(*) as value
from public.bookings
where user_email like 'dinklab-load-%@example.test'
group by payment_method
order by payment_method;

select
  count(*) filter (where pending.status = 'PENDING_REVIEW') as pending_rows_checked,
  count(*) filter (where accepted.id is not null) as pending_rows_with_accepted_conflict
from public.bookings pending
left join public.bookings accepted
  on accepted.id <> pending.id
 and accepted.court_id = pending.court_id
 and accepted.status = 'ACCEPTED'
 and accepted.start_at < pending.end_at
 and accepted.end_at > pending.start_at
where pending.user_email like 'dinklab-load-%@example.test'
  and pending.status = 'PENDING_REVIEW';

-- Optional cleanup-only block:
-- Run this block by itself when you want to remove the generated data.
/*
begin;

delete from public.bookings
where user_email like 'dinklab-load-%@example.test'
   or payment_reference like 'DL-LOAD-%'
   or payment_proof_public_id like 'dinklab/load-tests/%';

delete from public.admins
where email = 'dinklab-load-admin@example.test';

commit;
*/

-- Optional performance probes for app hot paths.
-- Run after the seed data exists.

explain analyze
select id, user_email, customer_name, customer_contact, start_at, end_at,
  hourly_rate, total_amount, downpayment_amount, payment_method,
  payment_reference, payment_proof_url, status, reviewed_at,
  reviewed_by_email, review_reason
from public.bookings
order by created_at desc
limit 20;

explain analyze
select id, user_email, customer_name, customer_contact, start_at, end_at,
  hourly_rate, total_amount, downpayment_amount, payment_method,
  payment_reference, payment_proof_url, status, reviewed_at,
  reviewed_by_email, review_reason
from public.bookings
where status = 'PENDING_REVIEW'
  and payment_method = 'BPI'
  and court_id = '00000000-0000-0000-0000-000000000001'
  and start_at >= ('2035-07-20 00:00'::timestamp at time zone 'Asia/Manila')
  and start_at < ('2035-07-21 00:00'::timestamp at time zone 'Asia/Manila')
  and (
    customer_name ilike '%Load Player 0%'
    or user_email ilike '%Load Player 0%'
    or customer_contact ilike '%Load Player 0%'
    or payment_reference ilike '%Load Player 0%'
  )
order by created_at desc
limit 20;

explain analyze
select id, court_id, start_at, end_at, total_amount, downpayment_amount,
  payment_method, status, accepted_at, reviewed_at, review_reason
from public.bookings
where user_id = (
  select user_id from public.bookings where user_email = 'dinklab-load-user-001@example.test' limit 1
)
order by start_at desc
limit 24;

explain analyze
select id, start_at, end_at, accepted_at
from public.bookings
where user_id = (
  select user_id from public.bookings where user_email = 'dinklab-load-user-001@example.test' limit 1
)
  and status = 'ACCEPTED'
  and start_at >= now()
order by start_at asc
limit 8;

explain analyze
select start_at, end_at, status, user_id, user_email, customer_name, customer_avatar_url
from public.bookings
where court_id = '00000000-0000-0000-0000-000000000001'
  and start_at < ('2035-07-22 01:00'::timestamp at time zone 'Asia/Manila')
  and end_at > ('2035-07-21 08:00'::timestamp at time zone 'Asia/Manila');

-- Optional RLS/security visibility probes.
-- These simulate Supabase request JWT claims in the SQL editor.

begin;
set local role anon;
select 'anon_public_courts' as check_name, count(*) as visible_rows from public.courts;
select 'anon_public_booking_settings' as check_name, count(*) as visible_rows from public.booking_settings;
select 'anon_public_pricing_bands' as check_name, count(*) as visible_rows from public.pricing_bands;
select 'anon_bookings_should_be_0' as check_name, count(*) as visible_rows from public.bookings;
commit;

begin;
with claims as (
  select
    (select user_id::text from public.bookings where user_email = 'dinklab-load-user-001@example.test' limit 1) as sub,
    'dinklab-load-user-001@example.test' as email
)
select
  set_config('request.jwt.claim.sub', sub, true),
  set_config('request.jwt.claim.email', email, true),
  set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', sub, 'email', email, 'role', 'authenticated')::text,
    true
  )
from claims;
set local role authenticated;
select 'user_001_own_bookings' as check_name, count(*) as visible_rows
from public.bookings;
select 'user_001_other_user_bookings_should_be_0' as check_name, count(*) as visible_rows
from public.bookings
where user_email = 'dinklab-load-user-002@example.test';
commit;

begin;
with claims as (
  select
    (select user_id::text from public.bookings where user_email = 'dinklab-load-user-001@example.test' limit 1) as sub,
    'dinklab-load-admin@example.test' as email
)
select
  set_config('request.jwt.claim.sub', sub, true),
  set_config('request.jwt.claim.email', email, true),
  set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', sub, 'email', email, 'role', 'authenticated')::text,
    true
  )
from claims;
set local role authenticated;
select 'admin_all_bookings' as check_name, count(*) as visible_rows
from public.bookings;
select 'admin_admins_visible' as check_name, count(*) as visible_rows
from public.admins;
commit;

-- Destructive negative-security checks are intentionally commented out.
-- Uncomment one at a time in a disposable database if you want to confirm
-- that RLS blocks cross-user writes/deletes.
/*
begin;
with claims as (
  select
    (select user_id::text from public.bookings where user_email = 'dinklab-load-user-001@example.test' limit 1) as sub,
    'dinklab-load-user-001@example.test' as email
)
select
  set_config('request.jwt.claim.sub', sub, true),
  set_config('request.jwt.claim.email', email, true),
  set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', sub, 'email', email, 'role', 'authenticated')::text,
    true
  )
from claims;
set local role authenticated;

-- Should affect 0 rows because user 001 cannot delete user 002 bookings.
delete from public.bookings
where user_email = 'dinklab-load-user-002@example.test';

rollback;
*/
