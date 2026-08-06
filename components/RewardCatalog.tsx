"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

interface Reward {
  id: string;
  slug: string;
  name: string;
  description: string;
  credits_required: number;
  estimated_reward_value_cents: number;
}

const cacheThemes = [
  { className: "reward-cache-field", label: "FIELD CACHE" },
  { className: "reward-cache-veteran", label: "VETERAN CACHE" },
  { className: "reward-cache-arsenal", label: "ARSENAL CACHE" },
];

function CacheEmblem({ index }: { index: number }) {
  if (index === 1) {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M9 19 32 7l23 12-23 12L9 19Z" />
        <path d="M9 19v27l23 11V31L9 19Zm46 0v27L32 57V31l23-12Z" />
        <path d="M23 35h18M32 27v17" className="reward-cache-detail" />
      </svg>
    );
  }

  if (index === 2) {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="m32 5 23 13v28L32 59 9 46V18L32 5Z" />
        <path d="m19 24 7 6 6-12 6 12 7-6-4 18H23l-4-18Z" className="reward-cache-detail-fill" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="m32 4 25 15-5 30-20 11L12 49 7 19 32 4Z" />
      <path d="M19 39 32 17l13 22H19Z" className="reward-cache-detail-fill" />
      <path d="M25 40h14v8H25z" className="reward-cache-detail-fill" />
    </svg>
  );
}

export default function RewardCatalog() {
  const supabase = useMemo(() => getSupabase(), []);
  const [credits, setCredits] = useState(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [account, catalog] = await Promise.all([
      supabase.from("loyalty_accounts").select("supply_credits").eq("user_id", user.id).maybeSingle(),
      supabase.from("reward_catalog").select("id,slug,name,description,credits_required,estimated_reward_value_cents").eq("active", true).order("credits_required"),
    ]);

    if (account.error) setStatus(account.error.message);
    else setCredits(Number((account.data as { supply_credits?: number } | null)?.supply_credits ?? 0));

    if (catalog.error) setStatus(catalog.error.message);
    else setRewards((catalog.data ?? []) as Reward[]);
  }

  useEffect(() => { void load(); }, []);

  async function redeem(slug: string) {
    if (!window.confirm("Redeem this bonus drop? Supply Credits are deducted immediately and a standalone Reward order will be added to fulfillment.")) return;
    setStatus("Submitting redemption...");
    const { error } = await (supabase as any).rpc("redeem_reward", { reward_slug: slug });
    if (error) setStatus(error.message);
    else {
      setStatus("Reward redeemed. A standalone Reward order is now in the fulfillment queue.");
      await load();
    }
  }

  return (
    <section className="reward-catalog-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">SUPPLY REWARDS</p>
          <h2>Bonus drop catalog</h2>
          <p>Redeem slowly earned Supply Credits for an additional curated skin delivered outside your normal monthly rotation.</p>
        </div>
        <div className="reward-credit-pill"><small>AVAILABLE</small><strong>{credits}</strong><span>credits</span></div>
      </div>

      {rewards.length ? (
        <div className="reward-catalog-grid">
          {rewards.map((reward, index) => {
            const enough = credits >= reward.credits_required;
            const theme = cacheThemes[index] ?? cacheThemes[2];
            return (
              <article className={theme.className} key={reward.id}>
                <div className="reward-cache-art" aria-hidden="true">
                  <span className="reward-cache-glow" />
                  <CacheEmblem index={index} />
                </div>
                <small>{theme.label}</small>
                <h3>{reward.name}</h3>
                <p>{reward.description}</p>
                <div className="reward-cache-value"><b>{reward.credits_required} credits</b><span>Estimated bonus value ${(reward.estimated_reward_value_cents / 100).toFixed(2)}</span></div>
                <button className={`button ${enough ? "primary" : "secondary"}`} disabled={!enough} onClick={() => void redeem(reward.slug)}>
                  {enough ? "Redeem bonus drop" : `${reward.credits_required - credits} credits remaining`}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="empty-state">No rewards are active in the catalog.</p>
      )}
      {status && <p className="reward-status">{status}</p>}
    </section>
  );
}
