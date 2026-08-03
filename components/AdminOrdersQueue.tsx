"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "@/app/admin/admin.module.css";

type Member = {
  user_id: string;
  display_name: string;
  email: string;
};

type Order = {
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

type EditableOrder = Order & {
  dirty?: boolean;
};

const weapons = [
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

const tiers = [
  "Recruit",
  "Operative",
  "Vanguard",
  "Elite",
  "Master",
  "Prestige",
];

export default function AdminOrdersQueue() {
  const supabase = useMemo(() => getSupabase(), []);
  const [orders, setOrders] = useState<EditableOrder[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState("open");
  const [showCreate, setShowCreate] = useState(false);

  const [newOrder, setNewOrder] = useState({
    user_id: "",
    cycle_month: new Date().toISOString().slice(0, 7) + "-01",
    tier_name: "",
  });

  async function load() {
    setStatus("Loading orders...");

    const [ordersResult, membersResult] = await Promise.all([
      (supabase as any).rpc("get_admin_fulfillment_orders"),
      (supabase as any).rpc("get_admin_member_directory"),
    ]);

    if (ordersResult.error) {
      setStatus(ordersResult.error.message);
      return;
    }

    if (membersResult.error) {
      setStatus(membersResult.error.message);
      return;
    }

    setOrders((ordersResult.data ?? []) as EditableOrder[]);
    setMembers((membersResult.data ?? []) as Member[]);
    setStatus("");
  }

  useEffect(() => {
    void load();
  }, []);

  function changeOrder(
    orderId: string,
    field: keyof EditableOrder,
    value: string | number | null,
  ) {
    setOrders((current) =>
      current.map((order) =>
        order.order_id === orderId
          ? { ...order, [field]: value, dirty: true }
          : order,
      ),
    );
  }

  async function saveOrder(order: EditableOrder) {
    setSaving(order.order_id);
    setStatus("Saving order...");

    const { error } = await (supabase.from("fulfillment_orders") as any)
      .update({
        tier_name: order.tier_name || null,
        weapon_category: order.weapon_category || null,
        skin_name: order.skin_name || null,
        exterior: order.exterior || null,
        steam_reference_value:
          order.steam_reference_value === null ||
          order.steam_reference_value === undefined
            ? null
            : Number(order.steam_reference_value),
        acquisition_cost:
          order.acquisition_cost === null ||
          order.acquisition_cost === undefined
            ? null
            : Number(order.acquisition_cost),
        trade_offer_id: order.trade_offer_id || null,
        trade_offer_url: order.trade_offer_url || null,
        admin_notes: order.admin_notes || null,
        status: order.status,
      })
      .eq("id", order.order_id);

    setSaving(null);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Order saved.");
    await load();
  }

  async function createOrder() {
    if (!newOrder.user_id) {
      setStatus("Select a member first.");
      return;
    }

    setStatus("Creating test order...");

    const { error } = await (supabase.from("fulfillment_orders") as any).insert({
      user_id: newOrder.user_id,
      cycle_month: newOrder.cycle_month,
      tier_name: newOrder.tier_name || null,
      status: "draft",
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setShowCreate(false);
    setNewOrder({
      user_id: "",
      cycle_month: new Date().toISOString().slice(0, 7) + "-01",
      tier_name: "",
    });
    setStatus("Test order created.");
    await load();
  }

  const visibleOrders = orders.filter((order) => {
    if (filter === "all") return true;
    if (filter === "fulfilled") return order.status === "fulfilled";
    return !["fulfilled", "cancelled"].includes(order.status);
  });

  const openCount = orders.filter(
    (order) => !["fulfilled", "cancelled"].includes(order.status),
  ).length;

  const fulfilledCount = orders.filter(
    (order) => order.status === "fulfilled",
  ).length;

  return (
    <section className={styles.ordersSection}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>FULFILLMENT</p>
          <h2>Orders Queue</h2>
          <p>
            Every order appears as one line. Fill in the skin details and move
            it through fulfillment without opening a member profile.
          </p>
        </div>

        <div className={styles.summaryRow}>
          <span>
            <small>OPEN</small>
            <strong>{openCount}</strong>
          </span>
          <span>
            <small>FULFILLED</small>
            <strong>{fulfilledCount}</strong>
          </span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {[
            ["open", "Open"],
            ["fulfilled", "Fulfilled"],
            ["all", "All"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? styles.activeFilter : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.toolbarActions}>
          <button type="button" onClick={() => void load()}>
            Refresh
          </button>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => setShowCreate((current) => !current)}
          >
            + Test order
          </button>
        </div>
      </div>

      {showCreate && (
        <div className={styles.createBar}>
          <select
            value={newOrder.user_id}
            onChange={(event) =>
              setNewOrder({ ...newOrder, user_id: event.target.value })
            }
          >
            <option value="">Select member</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.display_name} · {member.email}
              </option>
            ))}
          </select>

          <select
            value={newOrder.tier_name}
            onChange={(event) =>
              setNewOrder({ ...newOrder, tier_name: event.target.value })
            }
          >
            <option value="">Tier</option>
            {tiers.map((tier) => (
              <option key={tier}>{tier}</option>
            ))}
          </select>

          <input
            type="date"
            value={newOrder.cycle_month}
            onChange={(event) =>
              setNewOrder({ ...newOrder, cycle_month: event.target.value })
            }
          />

          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => void createOrder()}
          >
            Create
          </button>
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.ordersTable}>
          <thead>
            <tr>
              <th>Member / Cycle</th>
              <th>Tier</th>
              <th>Weapon</th>
              <th>Skin / Exterior</th>
              <th>Steam Value</th>
              <th>Cost</th>
              <th>Trade ID</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {visibleOrders.map((order) => {
              const spread =
                order.steam_reference_value != null &&
                order.acquisition_cost != null
                  ? Number(order.steam_reference_value) -
                    Number(order.acquisition_cost)
                  : null;

              return (
                <tr key={order.order_id}>
                  <td className={styles.memberCell}>
                    <strong>{order.display_name}</strong>
                    <span>{order.email}</span>
                    <small>
                      {new Date(order.cycle_month).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </small>
                  </td>

                  <td>
                    <select
                      value={order.tier_name ?? ""}
                      onChange={(event) =>
                        changeOrder(
                          order.order_id,
                          "tier_name",
                          event.target.value,
                        )
                      }
                    >
                      <option value="">—</option>
                      {tiers.map((tier) => (
                        <option key={tier}>{tier}</option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <select
                      value={order.weapon_category ?? ""}
                      onChange={(event) =>
                        changeOrder(
                          order.order_id,
                          "weapon_category",
                          event.target.value,
                        )
                      }
                    >
                      <option value="">Select</option>
                      {weapons.map((weapon) => (
                        <option key={weapon}>{weapon}</option>
                      ))}
                    </select>
                  </td>

                  <td className={styles.skinCell}>
                    <input
                      value={order.skin_name ?? ""}
                      placeholder="Skin name"
                      onChange={(event) =>
                        changeOrder(
                          order.order_id,
                          "skin_name",
                          event.target.value,
                        )
                      }
                    />
                    <input
                      value={order.exterior ?? ""}
                      placeholder="Exterior"
                      onChange={(event) =>
                        changeOrder(
                          order.order_id,
                          "exterior",
                          event.target.value,
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      className={styles.moneyInput}
                      type="number"
                      min="0"
                      step="0.01"
                      value={order.steam_reference_value ?? ""}
                      placeholder="0.00"
                      onChange={(event) =>
                        changeOrder(
                          order.order_id,
                          "steam_reference_value",
                          event.target.value
                            ? Number(event.target.value)
                            : null,
                        )
                      }
                    />
                    {spread !== null && (
                      <small className={styles.spread}>
                        Spread ${spread.toFixed(2)}
                      </small>
                    )}
                  </td>

                  <td>
                    <input
                      className={styles.moneyInput}
                      type="number"
                      min="0"
                      step="0.01"
                      value={order.acquisition_cost ?? ""}
                      placeholder="0.00"
                      onChange={(event) =>
                        changeOrder(
                          order.order_id,
                          "acquisition_cost",
                          event.target.value
                            ? Number(event.target.value)
                            : null,
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      value={order.trade_offer_id ?? ""}
                      placeholder="Trade ID"
                      onChange={(event) =>
                        changeOrder(
                          order.order_id,
                          "trade_offer_id",
                          event.target.value,
                        )
                      }
                    />
                  </td>

                  <td>
                    <select
                      className={`${styles.statusSelect} ${
                        styles[`status_${order.status}`] ?? ""
                      }`}
                      value={order.status}
                      onChange={(event) =>
                        changeOrder(
                          order.order_id,
                          "status",
                          event.target.value,
                        )
                      }
                    >
                      {statuses.map((statusValue) => (
                        <option key={statusValue} value={statusValue}>
                          {statusValue.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <button
                      className={
                        order.dirty
                          ? styles.saveButtonDirty
                          : styles.saveButton
                      }
                      type="button"
                      disabled={saving === order.order_id}
                      onClick={() => void saveOrder(order)}
                    >
                      {saving === order.order_id ? "Saving" : "Save"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!visibleOrders.length && (
          <div className={styles.emptyState}>
            <strong>No orders in this view.</strong>
            <span>New paid orders will appear here as line items.</span>
          </div>
        )}
      </div>

      {status && <p className={styles.pageStatus}>{status}</p>}
    </section>
  );
}
