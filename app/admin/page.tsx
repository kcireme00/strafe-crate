"use client";

import { useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AdminChatReports from "@/components/AdminChatReports";
import AdminFulfillmentBeta from "@/components/AdminFulfillmentBeta";
import { getSupabase } from "@/lib/supabase";

type Tab =
  | "overview"
  | "fulfillment"
  | "reports"
  | "moderation"
  | "members"
  | "rewards";

type ModerationLog = {
  id: string;
  action: string;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
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
      .select("id,action,reason,expires_at,created_at")
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

  const tabs: Array<[Tab, string]> = [
    ["overview", "Overview"],
    ["fulfillment", "Fulfillment Beta"],
    ["reports", "Reports"],
    ["moderation", "Moderation Log"],
    ["members", "Members"],
    ["rewards", "Rewards"],
  ];

  return (
    <main className="admin-command-shell shell">
      <header className="admin-command-hero">
        <div>
          <p className="eyebrow">PRIVATE ADMIN</p>
          <h1>Operations hub.</h1>
          <p>
            Fulfillment, reports, moderation, members, and rewards in one
            operating console.
          </p>
        </div>

        <div className="admin-command-badge">
          <small>ACCESS</small>
          <strong>FOUNDER ADMIN</strong>
          <span>Private control center</span>
        </div>
      </header>

      <nav className="admin-command-tabs" aria-label="Admin sections">
        {tabs.map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={tab === value ? "active" : ""}
            onClick={() => void changeTab(value)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <section className="admin-overview-grid">
          <article className="admin-overview-feature">
            <span>01</span>
            <small>FULFILLMENT</small>
            <h2>Beta-test the complete skin delivery workflow.</h2>
            <p>
              Select a member, choose the weapon and skin, enter Steam value,
              send the trade, and mark the order fulfilled.
            </p>
            <button className="button primary" type="button" onClick={() => void changeTab("fulfillment")}>
              Open fulfillment beta
            </button>
          </article>

          <article>
            <span>02</span>
            <small>COMMUNITY SAFETY</small>
            <h2>Review reported chat messages.</h2>
            <p>Delete messages, issue timeouts, permanently ban, or dismiss.</p>
            <button className="button secondary" type="button" onClick={() => void changeTab("reports")}>
              Open reports
            </button>
          </article>

          <article>
            <span>03</span>
            <small>AUDIT TRAIL</small>
            <h2>Moderation history.</h2>
            <p>See every timeout, deletion, ban, and reversal made by admins.</p>
            <button className="button secondary" type="button" onClick={() => void changeTab("moderation")}>
              View moderation log
            </button>
          </article>
        </section>
      )}

      {tab === "fulfillment" && <AdminFulfillmentBeta />}

      {tab === "reports" && <AdminChatReports />}

      {tab === "moderation" && (
        <section className="admin-log-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">AUDIT LOG</p>
              <h2>Moderation actions.</h2>
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
                  <small>
                    Restriction ends{" "}
                    {new Date(log.expires_at).toLocaleString()}
                  </small>
                )}
              </article>
            ))}

            {!logs.length && (
              <p className="admin-log-empty">
                No moderation actions recorded yet.
              </p>
            )}
          </div>
        </section>
      )}

      {tab === "members" && (
        <section className="admin-placeholder-panel">
          <p className="eyebrow">MEMBERS</p>
          <h2>Member controls.</h2>
          <p>
            This tab is reserved for approvals, roles, trophies, XP, membership
            tiers, and account restrictions.
          </p>
        </section>
      )}

      {tab === "rewards" && (
        <section className="admin-placeholder-panel">
          <p className="eyebrow">REWARDS</p>
          <h2>Reward operations.</h2>
          <p>
            This tab is reserved for Supply Credit redemptions, trophy awards,
            XP adjustments, and event rewards.
          </p>
        </section>
      )}

      {status && <p className="admin-command-status">{status}</p>}
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
