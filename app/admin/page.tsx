"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AdminOrdersQueue from "@/components/AdminOrdersQueue";
import AdminChatReports from "@/components/AdminChatReports";
import AdminChatBans from "@/components/AdminChatBans";
import AdminBusinessMetrics from "@/components/AdminBusinessMetrics";
import AdminSupportTickets from "@/components/AdminSupportTickets";
import AdminPrivateReviews from "@/components/AdminPrivateReviews";
import AdminLaunchEvent from "@/components/AdminLaunchEvent";
import styles from "./admin.module.css";

type Tab = "orders" | "reports" | "bans" | "tickets" | "reviews" | "events";

function AdminHub() {
  const [tab, setTab] = useState<Tab>("orders");

  const tabs: Array<[Tab, string]> = [
    ["orders", "Orders"],
    ["reports", "Reports"],
    ["bans", "Bans"],
    ["tickets", "Tickets"],
    ["reviews", "Reviews"],
    ["events", "Events"],
  ];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>PRIVATE ADMIN</p>
            <h1>Operations Hub</h1>
            <p className={styles.subtitle}>
              Fulfillment and community moderation in one operating console.
            </p>
          </div>

          <div className={styles.accessCard}>
            <small>ACCESS</small>
            <strong>FOUNDER ADMIN</strong>
          </div>
        </header>

        <AdminBusinessMetrics />

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

        {tab === "bans" && (
          <section className={styles.contentPanel}>
            <AdminChatBans />
          </section>
        )}


        {tab === "tickets" && (
          <section className={styles.contentPanel}>
            <AdminSupportTickets />
          </section>
        )}

        {tab === "reviews" && (
          <section className={styles.contentPanel}>
            <AdminPrivateReviews />
          </section>
        )}


        {tab === "events" && (
          <section className={styles.contentPanel}>
            <AdminLaunchEvent />
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
