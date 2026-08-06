"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import TierEmblem from "@/components/TierEmblem";
import styles from "./TierMemberTracker.module.css";

type TierCount = { tier_name: string; active_members: number };

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
    <section className={`${styles.section} shell`}>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">LIVE COLLECTION</p>
          <h2>Collectors building with us.</h2>
          <p>Verified active and trialing memberships, refreshed automatically.</p>
        </div>

        <div className={styles.totalCard}>
          <span className={ready ? styles.liveDot : styles.loadingDot} />
          <div>
            <strong>{total.toLocaleString()}</strong>
            <small>ACTIVE COLLECTORS</small>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {counts.map((item) => {
          const count = Number(item.active_members || 0);
          return (
            <article className={`${styles.card} ${styles[item.tier_name.toLowerCase()]}`} key={item.tier_name}>
              <div className={styles.iconWrap}>
                <TierEmblem tier={item.tier_name} className={styles.emblem} />
              </div>
              <div className={styles.cardCopy}>
                <small>{item.tier_name.toUpperCase()}</small>
                <strong>{count.toLocaleString()}</strong>
                <span>{count === 1 ? "active collector" : "active collectors"}</span>
              </div>
            </article>
          );
        })}
      </div>

      <p className={styles.note}>Live counts include active and trialing paid memberships only.</p>
    </section>
  );
}
