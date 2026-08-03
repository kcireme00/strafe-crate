"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type ReportRow = {
  report_id: string;
  report_status: "open" | "dismissed" | "actioned";
  report_reason: string;
  reported_at: string;
  message_id: string;
  message_body: string;
  message_created_at: string;
  reported_user_id: string;
  reported_display_name: string;
  reporter_user_id: string;
  reporter_display_name: string;
  current_ban_expires_at: string | null;
  permanently_banned: boolean;
};

type Action =
  | "dismiss"
  | "delete"
  | "timeout_1h"
  | "timeout_24h"
  | "timeout_7d"
  | "permanent_ban"
  | "remove_ban";

export default function AdminChatReports() {
  const supabase = useMemo(() => getSupabase(), []);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [busy, setBusy] = useState<string | null>(null);

  async function loadReports() {
    setStatus("Loading reports...");

    const { data, error } = await (supabase as any).rpc(
      "get_admin_chat_reports",
    );

    if (error) {
      setStatus(error.message);
      return;
    }

    setReports((data ?? []) as ReportRow[]);
    setStatus("");
  }

  useEffect(() => {
    void loadReports();
  }, []);

  async function takeAction(report: ReportRow, action: Action) {
    const labels: Record<Action, string> = {
      dismiss: "dismiss this report",
      delete: "delete this message",
      timeout_1h: "time this user out for 1 hour",
      timeout_24h: "time this user out for 24 hours",
      timeout_7d: "time this user out for 7 days",
      permanent_ban: "permanently ban this user from chat",
      remove_ban: "remove this user's chat restriction",
    };

    if (!window.confirm(`Are you sure you want to ${labels[action]}?`)) {
      return;
    }

    const reason =
      action === "dismiss" || action === "remove_ban"
        ? null
        : window.prompt(
            "Optional internal moderation reason:",
            report.report_reason || "",
          );

    setBusy(report.report_id);
    setStatus("Applying moderation action...");

    const { data, error } = await (supabase as any).rpc(
      "moderate_chat_report",
      {
        target_report_id: report.report_id,
        moderation_action: action,
        moderation_reason: reason,
      },
    );

    setBusy(null);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus(String(data ?? "Moderation action completed."));
    await loadReports();
  }

  const visibleReports =
    filter === "open"
      ? reports.filter((report) => report.report_status === "open")
      : reports;

  return (
    <main className="admin-reports-shell shell">
      <div className="admin-reports-heading">
        <div>
          <p className="eyebrow">ADMIN MODERATION</p>
          <h1>Chat reports.</h1>
          <p>
            Review reported messages, remove content, issue temporary
            timeouts, or permanently block community chat access.
          </p>
        </div>

        <div className="admin-report-summary">
          <span>
            <small>OPEN</small>
            <strong>
              {
                reports.filter((report) => report.report_status === "open")
                  .length
              }
            </strong>
          </span>
          <span>
            <small>TOTAL</small>
            <strong>{reports.length}</strong>
          </span>
        </div>
      </div>

      <div className="admin-report-toolbar">
        <div>
          <button
            className={filter === "open" ? "active" : ""}
            type="button"
            onClick={() => setFilter("open")}
          >
            Open reports
          </button>
          <button
            className={filter === "all" ? "active" : ""}
            type="button"
            onClick={() => setFilter("all")}
          >
            All reports
          </button>
        </div>

        <button
          className="button secondary"
          type="button"
          onClick={() => void loadReports()}
        >
          Refresh
        </button>
      </div>

      <section className="admin-report-list">
        {visibleReports.map((report) => {
          const restrictionText = report.permanently_banned
            ? "Permanently banned"
            : report.current_ban_expires_at
              ? `Timed out until ${new Date(
                  report.current_ban_expires_at,
                ).toLocaleString()}`
              : "No active restriction";

          return (
            <article
              className={`admin-report-card status-${report.report_status}`}
              key={report.report_id}
            >
              <div className="admin-report-card-top">
                <div>
                  <span className="admin-report-status">
                    {report.report_status}
                  </span>
                  <h2>{report.reported_display_name}</h2>
                  <p>
                    Reported by <strong>{report.reporter_display_name}</strong>
                    {" · "}
                    {new Date(report.reported_at).toLocaleString()}
                  </p>
                </div>

                <span className="admin-restriction-badge">
                  {restrictionText}
                </span>
              </div>

              <blockquote>{report.message_body}</blockquote>

              <div className="admin-report-reason">
                <small>REPORT REASON</small>
                <p>{report.report_reason || "Member report"}</p>
              </div>

              <div className="admin-report-actions">
                <button
                  type="button"
                  disabled={busy === report.report_id}
                  onClick={() => void takeAction(report, "delete")}
                >
                  Delete message
                </button>

                <button
                  type="button"
                  disabled={busy === report.report_id}
                  onClick={() => void takeAction(report, "timeout_1h")}
                >
                  Timeout 1h
                </button>

                <button
                  type="button"
                  disabled={busy === report.report_id}
                  onClick={() => void takeAction(report, "timeout_24h")}
                >
                  Timeout 24h
                </button>

                <button
                  type="button"
                  disabled={busy === report.report_id}
                  onClick={() => void takeAction(report, "timeout_7d")}
                >
                  Timeout 7d
                </button>

                <button
                  className="danger"
                  type="button"
                  disabled={busy === report.report_id}
                  onClick={() => void takeAction(report, "permanent_ban")}
                >
                  Ban from chat
                </button>

                {(report.permanently_banned ||
                  report.current_ban_expires_at) && (
                  <button
                    type="button"
                    disabled={busy === report.report_id}
                    onClick={() => void takeAction(report, "remove_ban")}
                  >
                    Remove restriction
                  </button>
                )}

                <button
                  className="subtle"
                  type="button"
                  disabled={busy === report.report_id}
                  onClick={() => void takeAction(report, "dismiss")}
                >
                  Dismiss report
                </button>
              </div>
            </article>
          );
        })}

        {!visibleReports.length && (
          <div className="admin-report-empty">
            <span>✓</span>
            <div>
              <strong>No reports to review.</strong>
              <p>The moderation queue is currently clear.</p>
            </div>
          </div>
        )}
      </section>

      {status && <p className="admin-report-page-status">{status}</p>}
    </main>
  );
}
