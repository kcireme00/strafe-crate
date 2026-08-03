"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import AdminChatReports from "@/components/AdminChatReports";
import { getSupabase } from "@/lib/supabase";

type Tab =
  | "overview"
  | "reports"
  | "moderation"
  | "members"
  | "orders"
  | "rewards";

type ModerationLog = {
  id: string;
  action: string;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
  target_user_id: string | null;
};

function AdminHubContent() {
  const supabase = useMemo(() => getSupabase(), []);
  const [tab, setTab] = useState<Tab>("overview");
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [status, setStatus] = useState("");

  async function loadLogs() {
    setStatus("Loading moderation log...");
    const { data, error } = await supabase
      .from("moderation_log")
      .select("id,action,reason,expires_at,created_at,target_user_id")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setStatus(error.message);
      return;
    }

    setLogs((data ?? []) as ModerationLog[]);
    setLogsLoaded(true);
    setStatus("");
  }

  async function changeTab(next: Tab) {
    setTab(next);
    if (next === "moderation" && !logsLoaded) {
      await loadLogs();
    }
  }

  return (
    <main className="admin-hub-shell shell">
      <div className="admin-hub-heading">
        <div>
          <p className="eyebrow">PRIVATE ADMIN</p>
          <h1>Operations hub.</h1>
          <p>
            Manage members, orders, rewards, reports, and community moderation
            from one place.
          </p>
        </div>
      </div>

      <nav className="admin-hub-tabs" aria-label="Admin sections">
        {[
          ["overview", "Overview"],
          ["reports", "Reports"],
          ["moderation", "Moderation log"],
          ["members", "Members"],
          ["orders", "Orders"],
          ["rewards", "Rewards"],
        ].map(([value, label]) => (
          <button
            className={tab === value ? "active" : ""}
            type="button"
            key={value}
            onClick={() => void changeTab(value as Tab)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <section className="admin-hub-overview">
          <article>
            <small>CHAT MODERATION</small>
            <h2>Review reports</h2>
            <p>Delete messages, issue timeouts, ban users, or dismiss reports.</p>
            <button className="button primary" type="button" onClick={() => void changeTab("reports")}>
              Open reports
            </button>
          </article>

          <article>
            <small>AUDIT TRAIL</small>
            <h2>Moderation history</h2>
            <p>Review every delete, timeout, ban, and reversal performed by admins.</p>
            <button className="button secondary" type="button" onClick={() => void changeTab("moderation")}>
              View log
            </button>
          </article>

          <article>
            <small>MEMBER OPERATIONS</small>
            <h2>Existing admin tools</h2>
            <p>Use the current dashboard for membership approvals and fulfillment.</p>
            <Link className="button secondary" href="/admin/reports">
              Open moderation route
            </Link>
          </article>
        </section>
      )}

      {tab === "reports" && <AdminChatReports />}

      {tab === "moderation" && (
        <section className="admin-log-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">AUDIT LOG</p>
              <h2>Moderation actions</h2>
            </div>
            <button className="button secondary" type="button" onClick={() => void loadLogs()}>
              Refresh
            </button>
          </div>

          <div className="admin-log-list">
            {logs.map((log) => (
              <article key={log.id}>
                <div>
                  <strong>{log.action.replaceAll("_", " ")}</strong>
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <p>{log.reason || "No internal reason recorded."}</p>
                {log.expires_at && (
                  <small>Restriction ends {new Date(log.expires_at).toLocaleString()}</small>
                )}
              </article>
            ))}
            {!logs.length && <p className="admin-log-empty">No moderation actions recorded yet.</p>}
          </div>
        </section>
      )}

      {tab === "members" && (
        <section className="admin-hub-placeholder">
          <h2>Members</h2>
          <p>
            This tab is reserved for account approvals, roles, trophies, XP,
            and member restrictions.
          </p>
        </section>
      )}

      {tab === "orders" && (
        <section className="admin-hub-placeholder">
          <h2>Orders</h2>
          <p>
            This tab is reserved for fulfillment queues, trades, delivery
            status, and drop history.
          </p>
        </section>
      )}

      {tab === "rewards" && (
        <section className="admin-hub-placeholder">
          <h2>Rewards</h2>
          <p>
            This tab is reserved for Supply Credit redemptions, XP awards, and
            trophy management.
          </p>
        </section>
      )}

      {status && <p className="admin-hub-status">{status}</p>}
    </main>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard admin>
      {() => <AdminHubContent />}
    </AuthGuard>
  );
}
