"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AdminOrdersQueue from "@/components/AdminOrdersQueue";
import AdminChatReports from "@/components/AdminChatReports";
import styles from "./admin.module.css";

type Tab = "orders" | "reports" | "members" | "rewards";

function AdminHub() {
  const [tab, setTab] = useState<Tab>("orders");

  const tabs: Array<[Tab, string]> = [
    ["orders", "Orders"],
    ["reports", "Reports"],
    ["members", "Members"],
    ["rewards", "Rewards"],
  ];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>PRIVATE ADMIN</p>
            <h1>Operations Hub</h1>
            <p className={styles.subtitle}>
              Fulfillment, moderation, members, and rewards in one place.
            </p>
          </div>

          <div className={styles.accessCard}>
            <small>ACCESS</small>
            <strong>FOUNDER ADMIN</strong>
          </div>
        </header>

        <nav className={styles.tabs} aria-label="Admin sections">
          {tabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={tab === value ? styles.activeTab : ""}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "orders" && <AdminOrdersQueue />}

        {tab === "reports" && (
          <section className={styles.contentPanel}>
            <AdminChatReports />
          </section>
        )}

        {tab === "members" && (
          <section className={styles.placeholder}>
            <p className={styles.eyebrow}>MEMBERS</p>
            <h2>Member controls</h2>
            <p>
              Membership approvals, roles, trophies, XP, and account controls
              will live here.
            </p>
          </section>
        )}

        {tab === "rewards" && (
          <section className={styles.placeholder}>
            <p className={styles.eyebrow}>REWARDS</p>
            <h2>Reward operations</h2>
            <p>
              Supply Credit redemptions, XP adjustments, trophy awards, and
              event rewards will live here.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard admin>
      {() => <AdminHub />}
    </AuthGuard>
  );
}
