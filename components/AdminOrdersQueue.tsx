"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "@/app/admin/admin.module.css";

type Member = { user_id: string; display_name: string; email: string };
type OrderItem = {
  id: string;
  weapon_category: string | null;
  skin_name: string | null;
  exterior: string | null;
  acquisition_cost: number | null;
  sort_order: number;
};
type Order = {
  order_id: string;
  user_id: string;
  display_name: string;
  email: string;
  cycle_month: string;
  tier_name: string | null;
  membership_value: number | null;
  order_type: string | null;
  trade_offer_url: string | null;
  trade_offer_id: string | null;
  status: string;
  admin_notes: string | null;
  items: OrderItem[];
  upgrade_request_id: string | null;
  upgrade_request_status: string | null;
  upgrade_source_skin: string | null;
  upgrade_source_weapon: string | null;
  upgrade_source_exterior: string | null;
  upgrade_target_cycle: string | null;
  is_upgrade: boolean;
  dirty?: boolean;
};

const weapons = ["AK-47","M4A1-S","M4A4","AWP","USP-S","Glock-18","Desert Eagle","Five-SeveN","P250","Tec-9","MAC-10","MP9","UMP-45","P90","Nova","XM1014","MAG-7","Negev","Knife","Gloves","Other"];
const statuses = ["draft","purchasing","ready_to_send","trade_sent","accepted","fulfilled","failed","cancelled"];
const tiers = ["Recruit","Operative","Vanguard","Elite","Master","Prestige","Reward"];

function blankItem(sortOrder: number): OrderItem {
  return { id: crypto.randomUUID(), weapon_category: null, skin_name: null, exterior: null, acquisition_cost: null, sort_order: sortOrder };
}

export default function AdminOrdersQueue() {
  const supabase = useMemo(() => getSupabase(), []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState("open");
  const [showCreate, setShowCreate] = useState(false);
  const [newOrder, setNewOrder] = useState({ user_id: "", cycle_month: new Date().toISOString().slice(0, 7) + "-01", tier_name: "", auto_randomize: true });

  async function load() {
    setStatus("Loading orders...");
    const [ordersResult, membersResult] = await Promise.all([
      (supabase as any).rpc("get_admin_fulfillment_orders_v3"),
      (supabase as any).rpc("get_admin_member_directory"),
    ]);
    if (ordersResult.error) { setStatus(ordersResult.error.message); return; }
    if (membersResult.error) { setStatus(membersResult.error.message); return; }
    setOrders(((ordersResult.data ?? []) as any[]).map((order) => ({
      ...order,
      items: Array.isArray(order.items) && order.items.length ? order.items : [blankItem(1)],
      is_upgrade: Boolean(order.is_upgrade),
    })));
    setMembers((membersResult.data ?? []) as Member[]);
    setStatus("");
  }

  useEffect(() => { void load(); }, []);

  function patchOrder(orderId: string, patch: Partial<Order>) {
    setOrders((current) => current.map((order) => order.order_id === orderId ? { ...order, ...patch, dirty: true } : order));
  }

  function patchItem(orderId: string, itemId: string, patch: Partial<OrderItem>) {
    setOrders((current) => current.map((order) => order.order_id === orderId ? {
      ...order,
      dirty: true,
      items: order.items.map((item) => item.id === itemId ? { ...item, ...patch } : item),
    } : order));
  }

  function addItem(orderId: string) {
    setOrders((current) => current.map((order) => order.order_id === orderId ? {
      ...order,
      dirty: true,
      items: [...order.items, blankItem(order.items.length + 1)],
    } : order));
  }

  function removeItem(orderId: string, itemId: string) {
    setOrders((current) => current.map((order) => {
      if (order.order_id !== orderId || order.items.length === 1) return order;
      return { ...order, dirty: true, items: order.items.filter((item) => item.id !== itemId).map((item, index) => ({ ...item, sort_order: index + 1 })) };
    }));
  }

  async function randomizeWeapon(order: Order, itemId: string) {
    setSaving(order.order_id);
    setStatus("Choosing an unused weapon category...");
    const { data, error } = await (supabase as any).rpc("assign_random_weapon_for_order", { target_order_id: order.order_id });
    setSaving(null);
    if (error) { setStatus(error.message); return; }
    const result = Array.isArray(data) ? data[0] : data;
    patchItem(order.order_id, itemId, { weapon_category: result?.weapon_category ?? null });
    setStatus(result?.rotation_reset ? `New rotation started with ${result.weapon_category}. Save the order to confirm.` : `Assigned ${result?.weapon_category ?? "a weapon"}. Save the order to confirm.`);
  }

  async function saveOrder(order: Order) {
    setSaving(order.order_id);
    setStatus("Saving order...");
    const payload = order.items.map((item, index) => ({
      id: item.id,
      weapon_category: item.weapon_category || null,
      skin_name: item.skin_name || null,
      exterior: item.exterior || null,
      acquisition_cost: item.acquisition_cost == null ? null : Number(item.acquisition_cost),
      sort_order: index + 1,
    }));
    const { error } = await (supabase as any).rpc("save_admin_fulfillment_order_v3", {
      target_order_id: order.order_id,
      new_tier_name: order.tier_name || null,
      new_membership_value: order.membership_value == null ? null : Number(order.membership_value),
      new_trade_offer_id: order.trade_offer_id || null,
      new_trade_offer_url: order.trade_offer_url || null,
      new_status: order.status,
      new_admin_notes: order.admin_notes || null,
      apply_upgrade: Boolean(order.is_upgrade),
      selected_upgrade_request_id: order.is_upgrade ? order.upgrade_request_id : null,
      order_items: payload,
    });
    setSaving(null);
    if (error) { setStatus(error.message); return; }
    setStatus("Order saved. Revenue and profit refreshed.");
    window.dispatchEvent(new CustomEvent("strafe:order-saved"));
    await load();
  }

  async function createOrder() {
    if (!newOrder.user_id) { setStatus("Select a member first."); return; }
    setStatus("Creating test order...");
    const { data, error } = await (supabase.from("fulfillment_orders") as any).insert({
      user_id: newOrder.user_id,
      cycle_month: newOrder.cycle_month,
      tier_name: newOrder.tier_name || null,
      status: "draft",
      is_test: true,
    }).select("id").single();
    if (error) { setStatus(error.message); return; }
    if (newOrder.auto_randomize && data?.id) await (supabase as any).rpc("assign_random_weapon_for_order", { target_order_id: data.id });
    setShowCreate(false);
    setNewOrder({ user_id: "", cycle_month: new Date().toISOString().slice(0, 7) + "-01", tier_name: "", auto_randomize: true });
    await load();
  }

  const visibleOrders = orders.filter((order) => filter === "all" ? true : filter === "fulfilled" ? order.status === "fulfilled" : !["fulfilled","cancelled"].includes(order.status));
  const openCount = orders.filter((order) => !["fulfilled","cancelled"].includes(order.status)).length;
  const fulfilledCount = orders.filter((order) => order.status === "fulfilled").length;

  return (
    <section className={styles.ordersSection}>
      <div className={styles.sectionHeader}>
        <div><p className={styles.eyebrow}>FULFILLMENT</p><h2>Orders Queue</h2><p>Each order stays on one row while supporting one or several skins when a higher-value membership needs to be split.</p></div>
        <div className={styles.summaryRow}><span><small>OPEN</small><strong>{openCount}</strong></span><span><small>FULFILLED</small><strong>{fulfilledCount}</strong></span></div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters}>{[["open","Open"],["fulfilled","Fulfilled"],["all","All"]].map(([value,label]) => <button key={value} type="button" className={filter===value?styles.activeFilter:""} onClick={()=>setFilter(value)}>{label}</button>)}</div>
        <div className={styles.toolbarActions}><button type="button" onClick={()=>void load()}>Refresh</button><button className={styles.primaryButton} type="button" onClick={()=>setShowCreate((value)=>!value)}>+ Test order</button></div>
      </div>

      {showCreate && <div className={styles.createBar}>
        <select value={newOrder.user_id} onChange={(event)=>setNewOrder({...newOrder,user_id:event.target.value})}><option value="">Select member</option>{members.map((member)=><option key={member.user_id} value={member.user_id}>{member.display_name} · {member.email}</option>)}</select>
        <select value={newOrder.tier_name} onChange={(event)=>setNewOrder({...newOrder,tier_name:event.target.value})}><option value="">Tier</option>{tiers.filter((tier)=>tier!=="Reward").map((tier)=><option key={tier}>{tier}</option>)}</select>
        <input type="date" value={newOrder.cycle_month} onChange={(event)=>setNewOrder({...newOrder,cycle_month:event.target.value})}/>
        <label className={styles.randomizeToggle}><input type="checkbox" checked={newOrder.auto_randomize} onChange={(event)=>setNewOrder({...newOrder,auto_randomize:event.target.checked})}/>Auto-pick unused weapon</label>
        <button className={styles.primaryButton} type="button" onClick={()=>void createOrder()}>Create</button>
      </div>}

      <div className={styles.orderCards}>
        {visibleOrders.map((order) => {
          const totalCost = order.items.reduce((sum,item)=>sum+Number(item.acquisition_cost||0),0);
          const profit = Number(order.membership_value||0)-totalCost;
          return <article className={styles.orderCard} key={order.order_id}>
            <div className={styles.orderCardHeader}>
              <div className={styles.orderMember}>
                {order.trade_offer_url ? <a href={order.trade_offer_url} target="_blank" rel="noopener noreferrer">{order.display_name}<span>Steam trade ↗</span></a> : <strong>{order.display_name}</strong>}
                <small>{order.email}</small>
                <em>{order.order_type === "reward" ? "REWARD · STANDALONE" : new Date(order.cycle_month).toLocaleDateString("en-US",{month:"short",year:"numeric"})}</em>
              </div>
              <select value={order.tier_name??""} onChange={(event)=>patchOrder(order.order_id,{tier_name:event.target.value})}>{tiers.map((tier)=><option key={tier}>{tier}</option>)}</select>
              <div className={styles.orderMoney}><label>Membership value<input type="number" min="0" step="0.01" value={order.membership_value??""} onChange={(event)=>patchOrder(order.order_id,{membership_value:event.target.value?Number(event.target.value):null})}/></label><span>Cost ${totalCost.toFixed(2)} · <b className={profit>=0?styles.positive:styles.negative}>Profit ${profit.toFixed(2)}</b></span></div>
              <select className={styles.statusSelect} value={order.status} onChange={(event)=>patchOrder(order.order_id,{status:event.target.value})}>{statuses.map((value)=><option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}</select>
            </div>

            {order.upgrade_request_id && <div className={styles.upgradeRequest}>
              <div><small>UPGRADE INTENT FOR THIS CYCLE</small><strong>{[order.upgrade_source_weapon,order.upgrade_source_skin,order.upgrade_source_exterior].filter(Boolean).join(" · ")}</strong><span>Request status: {order.upgrade_request_status?.replaceAll("_"," ")}</span></div>
              <label><input type="checkbox" checked={order.is_upgrade} onChange={(event)=>patchOrder(order.order_id,{is_upgrade:event.target.checked})}/>Apply upgrade to this order</label>
            </div>}

            <div className={styles.orderItems}>
              {order.items.map((item,index)=><div className={styles.orderItem} key={item.id}>
                <span className={styles.itemNumber}>SKIN {index+1}</span>
                <label>Weapon<select value={item.weapon_category??""} onChange={(event)=>patchItem(order.order_id,item.id,{weapon_category:event.target.value})}><option value="">Select</option>{weapons.map((weapon)=><option key={weapon}>{weapon}</option>)}</select><button type="button" onClick={()=>void randomizeWeapon(order,item.id)}>Randomize unused</button></label>
                <label>Skin<input value={item.skin_name??""} placeholder={order.order_type==="reward"?"Reward":"Skin name"} onChange={(event)=>patchItem(order.order_id,item.id,{skin_name:event.target.value})}/></label>
                <label>Exterior<input value={item.exterior??""} placeholder={order.order_type==="reward"?"Reward":"Exterior"} onChange={(event)=>patchItem(order.order_id,item.id,{exterior:event.target.value})}/></label>
                <label>Cost<input type="number" min="0" step="0.01" value={item.acquisition_cost??""} placeholder="0.00" onChange={(event)=>patchItem(order.order_id,item.id,{acquisition_cost:event.target.value?Number(event.target.value):null})}/></label>
                {order.items.length>1 && <button className={styles.removeItem} type="button" onClick={()=>removeItem(order.order_id,item.id)}>Remove</button>}
              </div>)}
              <button className={styles.addItem} type="button" onClick={()=>addItem(order.order_id)}>+ Add another skin</button>
            </div>

            <div className={styles.orderFooter}>
              <label>Trade ID<input value={order.trade_offer_id??""} placeholder="Trade ID" onChange={(event)=>patchOrder(order.order_id,{trade_offer_id:event.target.value})}/></label>
              <label>Admin notes<input value={order.admin_notes??""} placeholder="Internal notes" onChange={(event)=>patchOrder(order.order_id,{admin_notes:event.target.value})}/></label>
              <button className={order.dirty?styles.saveButtonDirty:styles.saveButton} type="button" disabled={saving===order.order_id} onClick={()=>void saveOrder(order)}>{saving===order.order_id?"Saving...":"Save order"}</button>
            </div>
          </article>;
        })}
      </div>
      {!visibleOrders.length && <div className={styles.emptyState}><strong>No orders in this view.</strong><span>New membership and reward orders will appear here.</span></div>}
      {status && <p className={styles.pageStatus}>{status}</p>}
    </section>
  );
}
