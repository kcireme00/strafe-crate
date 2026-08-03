"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Member = {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  account_approved: boolean;
};

type FulfillmentOrder = {
  order_id: string;
  user_id: string;
  display_name: string;
  email: string;
  cycle_month: string;
  tier_name: string | null;
  weapon_category: string | null;
  skin_name: string | null;
  exterior: string | null;
  steam_reference_value: number | null;
  acquisition_cost: number | null;
  trade_offer_url: string | null;
  trade_offer_id: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  trade_sent_at: string | null;
  fulfilled_at: string | null;
};

const weaponCategories = [
  "AK-47",
  "M4A1-S",
  "M4A4",
  "AWP",
  "USP-S",
  "Glock-18",
  "Desert Eagle",
  "Five-SeveN",
  "P250",
  "Tec-9",
  "MAC-10",
  "MP9",
  "UMP-45",
  "P90",
  "Nova",
  "XM1014",
  "MAG-7",
  "Negev",
  "Knife",
  "Gloves",
  "Other",
];

const statuses = [
  "draft",
  "purchasing",
  "ready_to_send",
  "trade_sent",
  "accepted",
  "fulfilled",
  "failed",
  "cancelled",
];

export default function AdminFulfillmentBeta() {
  const supabase = useMemo(() => getSupabase(), []);
  const [members, setMembers] = useState<Member[]>([]);
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const [form, setForm] = useState({
    user_id: "",
    cycle_month: new Date().toISOString().slice(0, 7) + "-01",
    tier_name: "",
    weapon_category: "",
    skin_name: "",
    exterior: "",
    steam_reference_value: "",
    acquisition_cost: "",
    trade_offer_url: "",
    trade_offer_id: "",
    admin_notes: "",
  });

  async function load() {
    setStatus("Loading fulfillment queue...");

    const [memberResult, orderResult] = await Promise.all([
      (supabase as any).rpc("get_admin_member_directory"),
      (supabase as any).rpc("get_admin_fulfillment_orders"),
    ]);

    if (memberResult.error) {
      setStatus(memberResult.error.message);
      return;
    }

    if (orderResult.error) {
      setStatus(orderResult.error.message);
      return;
    }

    setMembers((memberResult.data ?? []) as Member[]);
    setOrders((orderResult.data ?? []) as FulfillmentOrder[]);
    setStatus("");
  }

  useEffect(() => {
    void load();
  }, []);

  async function createOrder() {
    if (!form.user_id) {
      setStatus("Select a member first.");
      return;
    }

    setStatus("Creating beta order...");

    const { error } = await (supabase.from("fulfillment_orders") as any).insert({
      user_id: form.user_id,
      cycle_month: form.cycle_month,
      tier_name: form.tier_name || null,
      weapon_category: form.weapon_category || null,
      skin_name: form.skin_name || null,
      exterior: form.exterior || null,
      steam_reference_value: form.steam_reference_value
        ? Number(form.steam_reference_value)
        : null,
      acquisition_cost: form.acquisition_cost
        ? Number(form.acquisition_cost)
        : null,
      trade_offer_url: form.trade_offer_url || null,
      trade_offer_id: form.trade_offer_id || null,
      admin_notes: form.admin_notes || null,
      status: "draft",
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Beta fulfillment order created.");
    setForm({
      user_id: "",
      cycle_month: new Date().toISOString().slice(0, 7) + "-01",
      tier_name: "",
      weapon_category: "",
      skin_name: "",
      exterior: "",
      steam_reference_value: "",
      acquisition_cost: "",
      trade_offer_url: "",
      trade_offer_id: "",
      admin_notes: "",
    });

    await load();
  }

  async function updateOrder(
    orderId: string,
    patch: Partial<{
      status: string;
      weapon_category: string;
      skin_name: string;
      exterior: string;
      steam_reference_value: number | null;
      acquisition_cost: number | null;
      trade_offer_url: string | null;
      trade_offer_id: string | null;
      admin_notes: string | null;
    }>,
  ) {
    setSaving(orderId);

    const { error } = await (supabase.from("fulfillment_orders") as any)
      .update(patch)
      .eq("id", orderId);

    setSaving(null);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Order updated.");
    await load();
  }

  async function deleteOrder(orderId: string) {
    if (!window.confirm("Delete this beta fulfillment order?")) return;

    const { error } = await (supabase.from("fulfillment_orders") as any)
      .delete()
      .eq("id", orderId);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Beta order deleted.");
    await load();
  }

  const openOrders = orders.filter(
    (order) => !["fulfilled", "cancelled"].includes(order.status),
  );

  const fulfilledOrders = orders.filter(
    (order) => order.status === "fulfilled",
  );

  return (
    <section className="fulfillment-beta">
      <div className="admin-section-heading">
        <div>
          <p className="eyebrow">FULFILLMENT BETA</p>
          <h2>Skin delivery testing.</h2>
          <p>
            Create a test order, choose the weapon and skin, track the trade,
            and confirm fulfillment before connecting Stripe.
          </p>
        </div>

        <div className="fulfillment-summary">
          <span><small>OPEN</small><strong>{openOrders.length}</strong></span>
          <span><small>FULFILLED</small><strong>{fulfilledOrders.length}</strong></span>
        </div>
      </div>

      <div className="fulfillment-layout">
        <article className="fulfillment-create-card">
          <h3>Create test order</h3>

          <label>
            Member
            <select
              value={form.user_id}
              onChange={(event) =>
                setForm({ ...form, user_id: event.target.value })
              }
            >
              <option value="">Select member</option>
              {members.map((member) => (
                <option value={member.user_id} key={member.user_id}>
                  {member.display_name} · {member.email}
                </option>
              ))}
            </select>
          </label>

          <div className="fulfillment-form-grid">
            <label>
              Cycle month
              <input
                type="date"
                value={form.cycle_month}
                onChange={(event) =>
                  setForm({ ...form, cycle_month: event.target.value })
                }
              />
            </label>

            <label>
              Tier
              <select
                value={form.tier_name}
                onChange={(event) =>
                  setForm({ ...form, tier_name: event.target.value })
                }
              >
                <option value="">Select tier</option>
                <option>Recruit</option>
                <option>Operative</option>
                <option>Vanguard</option>
                <option>Elite</option>
                <option>Master</option>
                <option>Prestige</option>
              </select>
            </label>

            <label>
              Weapon/category sent
              <select
                value={form.weapon_category}
                onChange={(event) =>
                  setForm({
                    ...form,
                    weapon_category: event.target.value,
                  })
                }
              >
                <option value="">Select category</option>
                {weaponCategories.map((weapon) => (
                  <option key={weapon}>{weapon}</option>
                ))}
              </select>
            </label>

            <label>
              Skin name
              <input
                value={form.skin_name}
                placeholder="AK-47 | Redline"
                onChange={(event) =>
                  setForm({ ...form, skin_name: event.target.value })
                }
              />
            </label>

            <label>
              Exterior
              <input
                value={form.exterior}
                placeholder="Field-Tested"
                onChange={(event) =>
                  setForm({ ...form, exterior: event.target.value })
                }
              />
            </label>

            <label>
              Steam reference value
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.steam_reference_value}
                placeholder="90.00"
                onChange={(event) =>
                  setForm({
                    ...form,
                    steam_reference_value: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Acquisition cost
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.acquisition_cost}
                placeholder="76.50"
                onChange={(event) =>
                  setForm({
                    ...form,
                    acquisition_cost: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Steam trade-offer ID
              <input
                value={form.trade_offer_id}
                placeholder="Optional"
                onChange={(event) =>
                  setForm({ ...form, trade_offer_id: event.target.value })
                }
              />
            </label>
          </div>

          <label>
            Trade-offer URL
            <input
              value={form.trade_offer_url}
              placeholder="Optional test trade URL"
              onChange={(event) =>
                setForm({ ...form, trade_offer_url: event.target.value })
              }
            />
          </label>

          <label>
            Admin notes
            <textarea
              value={form.admin_notes}
              placeholder="Beta test notes..."
              onChange={(event) =>
                setForm({ ...form, admin_notes: event.target.value })
              }
            />
          </label>

          <button
            className="button primary"
            type="button"
            onClick={() => void createOrder()}
          >
            Create test order
          </button>
        </article>

        <div className="fulfillment-queue">
          {orders.map((order) => {
            const margin =
              order.steam_reference_value != null &&
              order.acquisition_cost != null
                ? order.steam_reference_value - order.acquisition_cost
                : null;

            return (
              <article className={`fulfillment-order status-${order.status}`} key={order.order_id}>
                <div className="fulfillment-order-top">
                  <div>
                    <span className="fulfillment-status">
                      {order.status.replaceAll("_", " ")}
                    </span>
                    <h3>{order.display_name}</h3>
                    <p>{order.email} · {order.tier_name || "Tier pending"}</p>
                  </div>

                  <select
                    value={order.status}
                    disabled={saving === order.order_id}
                    onChange={(event) =>
                      void updateOrder(order.order_id, {
                        status: event.target.value,
                      })
                    }
                  >
                    {statuses.map((orderStatus) => (
                      <option value={orderStatus} key={orderStatus}>
                        {orderStatus.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fulfillment-order-body">
                  <div>
                    <small>WEAPON SENT</small>
                    <strong>{order.weapon_category || "Not selected"}</strong>
                    <span>
                      {order.skin_name || "Skin not entered"}
                      {order.exterior ? ` · ${order.exterior}` : ""}
                    </span>
                  </div>

                  <div>
                    <small>STEAM VALUE</small>
                    <strong>
                      {order.steam_reference_value != null
                        ? `$${Number(order.steam_reference_value).toFixed(2)}`
                        : "—"}
                    </strong>
                    <span>
                      Cost{" "}
                      {order.acquisition_cost != null
                        ? `$${Number(order.acquisition_cost).toFixed(2)}`
                        : "—"}
                    </span>
                  </div>

                  <div>
                    <small>VALUE SPREAD</small>
                    <strong>
                      {margin != null ? `$${margin.toFixed(2)}` : "—"}
                    </strong>
                    <span>Reference value minus acquisition cost</span>
                  </div>
                </div>

                <div className="fulfillment-order-actions">
                  <button
                    type="button"
                    onClick={() =>
                      void updateOrder(order.order_id, {
                        status: "purchasing",
                      })
                    }
                  >
                    Purchasing
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void updateOrder(order.order_id, {
                        status: "ready_to_send",
                      })
                    }
                  >
                    Ready
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void updateOrder(order.order_id, {
                        status: "trade_sent",
                      })
                    }
                  >
                    Trade sent
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void updateOrder(order.order_id, {
                        status: "accepted",
                      })
                    }
                  >
                    Accepted
                  </button>

                  <button
                    className="success"
                    type="button"
                    onClick={() =>
                      void updateOrder(order.order_id, {
                        status: "fulfilled",
                      })
                    }
                  >
                    Mark fulfilled
                  </button>

                  <button
                    className="danger"
                    type="button"
                    onClick={() => void deleteOrder(order.order_id)}
                  >
                    Delete
                  </button>
                </div>

                <div className="fulfillment-order-meta">
                  <span>Cycle {new Date(order.cycle_month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                  {order.trade_sent_at && <span>Sent {new Date(order.trade_sent_at).toLocaleString()}</span>}
                  {order.fulfilled_at && <span>Fulfilled {new Date(order.fulfilled_at).toLocaleString()}</span>}
                </div>
              </article>
            );
          })}

          {!orders.length && (
            <div className="fulfillment-empty">
              <span>◇</span>
              <div>
                <strong>No test orders yet.</strong>
                <p>Create one on the left to beta test the complete delivery workflow.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {status && <p className="fulfillment-page-status">{status}</p>}
    </section>
  );
}
