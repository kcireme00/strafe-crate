"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import TierEmblem from "@/components/TierEmblem";

type TierCount = {
  tier_name: string;
  active_members: number;
};

const tierOrder = ["Recruit", "Operative", "Vanguard", "Elite", "Master", "Prestige"];

export default function TierMemberTracker() {
  const supabase = useMemo(() => getSupabase(), []);
  const [counts, setCounts] = useState<TierCount[]>(
    tierOrder.map((tier_name) => ({ tier_name, active_members: 0 })),
  );
  const [ready, setReady] = useState(false);

  async function loadCounts() {
    const { data, error } = await (supabase as any).rpc("get_public_tier_counts");
    if (!error && data) setCounts(data as TierCount[]);
    setReady(true);
  }

  useEffect(() => {
    void loadCounts();
    const interval = window.setInterval(() => void loadCounts(), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const total = counts.reduce((sum, item) => sum + Number(item.active_members || 0), 0);

  return (
    <section className="tier-member-tracker shell">
      <div className="tier-tracker-heading">
        <div>
          <p className="eyebrow">LIVE COLLECTION</p>
          <h2>Members building with us.</h2>
          <p>Active and trialing memberships, updated automatically.</p>
        </div>

        <div className="tier-tracker-total">
          <span className={ready ? "tracker-live-dot" : ""} />
          <div>
            <strong>{total.toLocaleString()}</strong>
            <small>ACTIVE MEMBERS</small>
          </div>
        </div>
      </div>

      <div className="tier-tracker-grid">
        {counts.map((item) => (
          <article className={`tier-count-card tier-count-${item.tier_name.toLowerCase()}`} key={item.tier_name}>
            <TierEmblem tier={item.tier_name} className="tier-count-emblem" />
            <div>
              <small>{item.tier_name.toUpperCase()}</small>
              <strong>{Number(item.active_members).toLocaleString()}</strong>
              <span>{Number(item.active_members) === 1 ? "active member" : "active members"}</span>
            </div>
          </article>
        ))}
      </div>

      <p className="tier-tracker-note">
        Counts include active and trialing membership records only.
      </p>
    </section>
  );
}
