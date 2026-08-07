"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type BanRow = {
  user_id: string;
  display_name: string;
  email: string | null;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
  created_by_name: string;
  permanent: boolean;
};

export default function AdminChatBans() {
  const supabase = useMemo(() => getSupabase(), []);
  const [bans, setBans] = useState<BanRow[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function loadBans() {
    setStatus("Loading restrictions...");
    const { data, error } = await (supabase as any).rpc("get_admin_chat_bans");
    if (error) { setStatus(error.message); return; }
    setBans((data ?? []) as BanRow[]);
    setStatus("");
  }

  useEffect(() => { void loadBans(); }, []);

  async function removeBan(userId: string) {
    setBusy(userId);
    const { data, error } = await (supabase as any).rpc("admin_remove_chat_ban", { target_user_id: userId });
    setBusy(null);
    if (error) { setStatus(error.message); return; }
    setStatus(String(data ?? "Restriction removed."));
    setBans((current) => current.filter((ban) => ban.user_id !== userId));
  }

  return (
    <section className="bansWorkspace">
      <div className="bansHeading">
        <div>
          <p className="eyebrow">COMMUNITY ACCESS</p>
          <h2>Chat bans</h2>
          <p>View every active timeout and permanent community restriction.</p>
        </div>
        <div className="banCount"><small>ACTIVE</small><strong>{bans.length}</strong></div>
      </div>

      <div className="bansToolbar">
        <button className="button secondary" type="button" onClick={() => void loadBans()}>Refresh</button>
      </div>

      <div className="banList">
        {bans.map((ban) => (
          <article className="banCard" key={ban.user_id}>
            <div className="banIdentity">
              <span className={ban.permanent ? "banType permanent" : "banType temporary"}>
                {ban.permanent ? "Permanent" : "Temporary"}
              </span>
              <h3>{ban.display_name}</h3>
              {ban.email && <p>{ban.email}</p>}
            </div>
            <div className="banDetails">
              <div><small>REASON</small><strong>{ban.reason || "No reason provided"}</strong></div>
              <div><small>RESTRICTION</small><strong>{ban.permanent ? "No expiration" : `Until ${new Date(ban.expires_at!).toLocaleString()}`}</strong></div>
              <div><small>ISSUED BY</small><strong>{ban.created_by_name}</strong></div>
            </div>
            <button className="unbanButton" type="button" disabled={busy === ban.user_id} onClick={() => void removeBan(ban.user_id)}>
              {busy === ban.user_id ? "Removing..." : "Remove restriction"}
            </button>
          </article>
        ))}
        {!bans.length && <div className="moderationEmpty"><span>✓</span><div><strong>No active chat bans.</strong><p>Every member currently has community access.</p></div></div>}
      </div>
      {status && <p className="moderationPageStatus">{status}</p>}
    </section>
  );
}
