create or replace function public.get_admin_booking_groups(
  p_status text default null,
  p_court_id uuid default null,
  p_payment_method text default null,
  p_date_start timestamptz default null,
  p_date_end timestamptz default null,
  p_query text default null,
  p_limit integer default 10,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with grouped as (
    select
      b.booking_group_id,
      (array_agg(b.id order by b.start_at, b.id))[1] as id,
      min(b.created_at) as created_at,
      (array_agg(b.court_id order by b.start_at, b.id))[1] as court_id,
      (array_agg(b.user_email order by b.start_at, b.id))[1] as user_email,
      (array_agg(b.customer_name order by b.start_at, b.id))[1] as customer_name,
      (array_agg(b.customer_contact order by b.start_at, b.id))[1] as customer_contact,
      min(b.start_at) as start_at,
      max(b.end_at) as end_at,
      (array_agg(b.hourly_rate order by b.start_at, b.id))[1] as hourly_rate,
      sum(b.total_amount)::integer as total_amount,
      sum(b.downpayment_amount)::integer as downpayment_amount,
      (array_agg(b.payment_method order by b.start_at, b.id))[1] as payment_method,
      case
        when sum(b.downpayment_amount) >= sum(b.total_amount) then 'PAID'
        when sum(b.downpayment_amount) > 0 then 'HALF_PAID'
        else 'UNPAID'
      end as payment_status,
      (array_agg(b.payment_reference order by b.start_at, b.id))[1] as payment_reference,
      (array_agg(b.payment_proof_url order by b.start_at, b.id))[1] as payment_proof_url,
      (array_agg(b.status order by b.start_at, b.id))[1] as status,
      (array_agg(b.reviewed_at order by b.start_at, b.id))[1] as reviewed_at,
      (array_agg(b.reviewed_by_email order by b.start_at, b.id))[1] as reviewed_by_email,
      (array_agg(b.review_reason order by b.start_at, b.id))[1] as review_reason,
      jsonb_build_object(
        'name',
        (array_agg(c.name order by b.start_at, b.id))[1]
      ) as courts,
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'courtId', b.court_id,
          'courtName', c.name,
          'startAt', b.start_at,
          'endAt', b.end_at,
          'totalAmount', b.total_amount
        )
        order by b.start_at, b.id
      ) as schedule,
      array_agg(distinct b.court_id) as court_ids,
      bool_or(
        p_date_start is not null
        and b.start_at >= p_date_start
        and b.start_at < p_date_end
      ) as matches_date
    from public.bookings b
    join public.courts c on c.id = b.court_id
    group by b.booking_group_id
  ),
  filtered as (
    select *
    from grouped
    where
      (nullif(p_status, '') is null or status::text = p_status)
      and (
        p_court_id is null
        or p_court_id = any(court_ids)
      )
      and (
        nullif(p_payment_method, '') is null
        or payment_method::text = p_payment_method
      )
      and (
        p_date_start is null
        or matches_date
      )
      and (
        nullif(trim(p_query), '') is null
        or position(
          lower(trim(p_query)) in lower(
            concat_ws(
              ' ',
              customer_name,
              coalesce(user_email, ''),
              customer_contact,
              coalesce(payment_reference, '')
            )
          )
        ) > 0
      )
  ),
  page_rows as (
    select *
    from filtered
    order by created_at desc, id
    limit greatest(1, least(coalesce(p_limit, 10), 100))
    offset greatest(0, coalesce(p_offset, 0))
  )
  select jsonb_build_object(
    'bookingRows',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(page_rows) - 'court_ids' - 'matches_date'
          order by page_rows.created_at desc, page_rows.id
        )
        from page_rows
      ),
      '[]'::jsonb
    ),
    'totalCount',
    (select count(*) from filtered)
  );
$$;

revoke execute on function public.get_admin_booking_groups(
  text, uuid, text, timestamptz, timestamptz, text, integer, integer
) from public;
revoke execute on function public.get_admin_booking_groups(
  text, uuid, text, timestamptz, timestamptz, text, integer, integer
) from anon;
revoke execute on function public.get_admin_booking_groups(
  text, uuid, text, timestamptz, timestamptz, text, integer, integer
) from authenticated;
grant execute on function public.get_admin_booking_groups(
  text, uuid, text, timestamptz, timestamptz, text, integer, integer
) to service_role;
