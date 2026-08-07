-- Strafe Crate revenue/profit live recalculation fix
-- Run once in Supabase SQL Editor after deploying the matching repository.

begin;

create or replace function public.get_admin_business_metrics()
returns table (
  period_key text,
  revenue_cents bigint,
  cost_cents bigint,
  profit_cents bigint,
  order_count bigint
)
language sql
volatile
security definer
set search_path = public
set row_security = off
as $$
  with item_costs as (
    select
      item.order_id,
      round(coalesce(sum(item.acquisition_cost), 0) * 100)::bigint
        as item_cost_cents
    from public.fulfillment_order_items item
    group by item.order_id
  ),
  valid_orders as (
    select
      fo.id,
      coalesce(
        fo.cycle_month,
        date_trunc('month', fo.billing_cycle)::date,
        date_trunc('month', fo.created_at)::date
      ) as effective_cycle,
      round(coalesce(fo.membership_value, 0) * 100)::bigint
        as order_revenue_cents,
      case
        when item_costs.order_id is not null
          then item_costs.item_cost_cents
        else round(coalesce(fo.acquisition_cost, 0) * 100)::bigint
      end as order_cost_cents
    from public.fulfillment_orders fo
    left join item_costs on item_costs.order_id = fo.id
    where coalesce(fo.is_test, false) = false
      and lower(coalesce(fo.status::text, '')) not in (
        'payment_failed',
        'failed',
        'cancelled',
        'canceled',
        'declined',
        'expired',
        'issue'
      )
  ),
  periods(period_key, start_date) as (
    values
      ('current_month'::text, date_trunc('month', current_date)::date),
      ('fiscal_year'::text, date_trunc('year', current_date)::date),
      ('lifetime'::text, date '1900-01-01')
  )
  select
    period.period_key,
    coalesce(sum(valid.order_revenue_cents), 0)::bigint,
    coalesce(sum(valid.order_cost_cents), 0)::bigint,
    coalesce(
      sum(valid.order_revenue_cents - valid.order_cost_cents),
      0
    )::bigint,
    count(valid.id)::bigint
  from periods period
  left join valid_orders valid
    on valid.effective_cycle >= period.start_date
  group by period.period_key
  order by
    case period.period_key
      when 'current_month' then 1
      when 'fiscal_year' then 2
      else 3
    end;
$$;

revoke all on function public.get_admin_business_metrics()
from public, anon;

grant execute on function public.get_admin_business_metrics()
to authenticated;

notify pgrst, 'reload schema';

commit;

-- Optional verification: compare saved order total with line-item total.
select
  fo.id,
  fo.membership_value,
  fo.acquisition_cost as saved_order_cost,
  coalesce(sum(item.acquisition_cost), 0) as line_item_cost
from public.fulfillment_orders fo
left join public.fulfillment_order_items item on item.order_id = fo.id
where coalesce(fo.is_test, false) = false
group by fo.id, fo.membership_value, fo.acquisition_cost
order by fo.updated_at desc
limit 20;
