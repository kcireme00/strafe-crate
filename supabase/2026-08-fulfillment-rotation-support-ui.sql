begin;

-- Admin queue with the member's current rotation and already-filled weapons.
create or replace function public.get_admin_fulfillment_orders_v4()
returns table (
  order_id uuid,
  user_id uuid,
  display_name text,
  email text,
  cycle_month date,
  tier_name text,
  membership_value numeric,
  order_type text,
  trade_offer_url text,
  trade_offer_id text,
  status text,
  admin_notes text,
  items jsonb,
  upgrade_request_id uuid,
  upgrade_request_status text,
  upgrade_source_skin text,
  upgrade_source_weapon text,
  upgrade_source_exterior text,
  upgrade_target_cycle date,
  is_upgrade boolean,
  rotation_cycle integer,
  used_weapon_categories jsonb,
  used_skin_names jsonb
)
language sql
volatile
security definer
set search_path = public
set row_security = off
as $$
  select
    base.order_id,
    base.user_id,
    base.display_name,
    base.email,
    base.cycle_month,
    base.tier_name,
    base.membership_value,
    base.order_type,
    base.trade_offer_url,
    base.trade_offer_id,
    base.status,
    base.admin_notes,
    base.items,
    base.upgrade_request_id,
    base.upgrade_request_status,
    base.upgrade_source_skin,
    base.upgrade_source_weapon,
    base.upgrade_source_exterior,
    base.upgrade_target_cycle,
    base.is_upgrade,
    coalesce(fo.rotation_cycle, state.current_cycle, 1),
    coalesce((
      select jsonb_agg(distinct used.weapon_name order by used.weapon_name)
      from (
        select coalesce(item.weapon_category, prior.weapon_category) as weapon_name
        from public.fulfillment_orders prior
        left join public.fulfillment_order_items item on item.order_id = prior.id
        where prior.user_id = base.user_id
          and prior.id <> base.order_id
          and coalesce(prior.rotation_cycle, state.current_cycle, 1) = coalesce(fo.rotation_cycle, state.current_cycle, 1)
          and prior.status::text not in ('failed','cancelled','declined','expired','issue')
          and coalesce(item.weapon_category, prior.weapon_category) is not null
      ) used
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(distinct used.skin_name order by used.skin_name)
      from (
        select coalesce(item.skin_name, prior.skin_name) as skin_name
        from public.fulfillment_orders prior
        left join public.fulfillment_order_items item on item.order_id = prior.id
        where prior.user_id = base.user_id
          and prior.id <> base.order_id
          and coalesce(prior.rotation_cycle, state.current_cycle, 1) = coalesce(fo.rotation_cycle, state.current_cycle, 1)
          and prior.status::text not in ('failed','cancelled','declined','expired','issue')
          and nullif(trim(coalesce(item.skin_name, prior.skin_name, '')), '') is not null
      ) used
    ), '[]'::jsonb)
  from public.get_admin_fulfillment_orders_v3() base
  join public.fulfillment_orders fo on fo.id = base.order_id
  left join public.member_rotation_state state on state.user_id = base.user_id;
$$;

revoke all on function public.get_admin_fulfillment_orders_v4() from public, anon;
grant execute on function public.get_admin_fulfillment_orders_v4() to authenticated;

create or replace function public.save_admin_fulfillment_order_v4(
  target_order_id uuid,
  new_tier_name text,
  new_membership_value numeric,
  new_trade_offer_id text,
  new_trade_offer_url text,
  new_status text,
  new_admin_notes text,
  apply_upgrade boolean,
  selected_upgrade_request_id uuid,
  order_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  order_user_id uuid;
  active_rotation integer;
  duplicate_weapon text;
  duplicate_skin text;
begin
  if not public.is_admin() then
    raise exception 'Admin permission required.';
  end if;

  select fo.user_id, coalesce(fo.rotation_cycle, state.current_cycle, 1)
  into order_user_id, active_rotation
  from public.fulfillment_orders fo
  left join public.member_rotation_state state on state.user_id = fo.user_id
  where fo.id = target_order_id;

  if order_user_id is null then
    raise exception 'Fulfillment order not found.';
  end if;

  -- Reject the same weapon twice inside the submitted order.
  select lower(value->>'weapon_category')
  into duplicate_weapon
  from jsonb_array_elements(coalesce(order_items, '[]'::jsonb)) item(value)
  where nullif(trim(value->>'weapon_category'),'') is not null
  group by lower(value->>'weapon_category')
  having count(*) > 1
  limit 1;

  if duplicate_weapon is not null then
    raise exception 'Weapon % appears more than once in this order.', duplicate_weapon;
  end if;

  -- Reject weapons already used in the member's active rotation.
  select submitted.weapon_name
  into duplicate_weapon
  from (
    select distinct lower(trim(value->>'weapon_category')) as weapon_name
    from jsonb_array_elements(coalesce(order_items, '[]'::jsonb)) item(value)
    where nullif(trim(value->>'weapon_category'),'') is not null
  ) submitted
  where exists (
    select 1
    from public.fulfillment_orders prior
    left join public.fulfillment_order_items prior_item on prior_item.order_id = prior.id
    where prior.user_id = order_user_id
      and prior.id <> target_order_id
      and coalesce(prior.rotation_cycle, active_rotation) = active_rotation
      and prior.status::text not in ('failed','cancelled','declined','expired','issue')
      and lower(coalesce(prior_item.weapon_category, prior.weapon_category, '')) = submitted.weapon_name
  )
  limit 1;

  if duplicate_weapon is not null then
    raise exception 'Weapon % was already fulfilled in Prestige rotation %. Complete the rotation and Prestige reset before using it again.', duplicate_weapon, active_rotation;
  end if;


  -- Reject the same exact skin name twice inside the submitted order.
  select lower(trim(value->>'skin_name'))
  into duplicate_skin
  from jsonb_array_elements(coalesce(order_items, '[]'::jsonb)) item(value)
  where nullif(trim(value->>'skin_name'),'') is not null
    and lower(trim(value->>'skin_name')) <> 'reward'
  group by lower(trim(value->>'skin_name'))
  having count(*) > 1
  limit 1;

  if duplicate_skin is not null then
    raise exception 'Skin % appears more than once in this order.', duplicate_skin;
  end if;

  -- Reject an exact skin name already fulfilled in the active Prestige rotation.
  select submitted.skin_name
  into duplicate_skin
  from (
    select distinct lower(trim(value->>'skin_name')) as skin_name
    from jsonb_array_elements(coalesce(order_items, '[]'::jsonb)) item(value)
    where nullif(trim(value->>'skin_name'),'') is not null
      and lower(trim(value->>'skin_name')) <> 'reward'
  ) submitted
  where exists (
    select 1
    from public.fulfillment_orders prior
    left join public.fulfillment_order_items prior_item on prior_item.order_id = prior.id
    where prior.user_id = order_user_id
      and prior.id <> target_order_id
      and coalesce(prior.rotation_cycle, active_rotation) = active_rotation
      and prior.status::text not in ('failed','cancelled','declined','expired','issue')
      and lower(trim(coalesce(prior_item.skin_name, prior.skin_name, ''))) = submitted.skin_name
  )
  limit 1;

  if duplicate_skin is not null then
    raise exception 'Skin % was already fulfilled in Prestige rotation %. Choose a different skin until the Prestige reset.', duplicate_skin, active_rotation;
  end if;

  perform public.save_admin_fulfillment_order_v3(
    target_order_id,
    new_tier_name,
    new_membership_value,
    new_trade_offer_id,
    new_trade_offer_url,
    new_status,
    new_admin_notes,
    apply_upgrade,
    selected_upgrade_request_id,
    order_items
  );
end;
$$;

revoke all on function public.save_admin_fulfillment_order_v4(uuid,text,numeric,text,text,text,text,boolean,uuid,jsonb) from public, anon;
grant execute on function public.save_admin_fulfillment_order_v4(uuid,text,numeric,text,text,text,text,boolean,uuid,jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
