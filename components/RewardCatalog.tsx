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
    if (!window.confirm("Redeem this reward? Supply Credits are deducted when the request is accepted.")) return;
    setStatus("Submitting redemption...");
    const { error } = await (supabase as any).rpc("redeem_reward", { reward_slug: slug });
    if (error) setStatus(error.message);
    else {
      setStatus("Redemption submitted for fulfillment review.");
      await load();
    }
  }

  return (
    <section className="reward-catalog-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">SUPPLY REWARDS</p>
          <h2>Bonus drop catalog</h2>
          <p>Supply Credits are loyalty rewards, not cash and not withdrawable account funds.</p>
        </div>
        <div className="reward-credit-pill"><small>AVAILABLE</small><strong>{credits}</strong><span>credits</span></div>
      </div>

      {rewards.length ? (
        <div className="reward-catalog-grid">
          {rewards.map((reward, index) => {
            const enough = credits >= reward.credits_required;
            return (
              <article key={reward.id}>
                <span className="reward-catalog-icon">{index + 1}</span>
                <small>SUPPLY CACHE</small>
                <h3>{reward.name}</h3>
                <p>{reward.description}</p>
                <div><b>{reward.credits_required} credits</b><span>Estimated bonus value ${(reward.estimated_reward_value_cents / 100).toFixed(2)}</span></div>
                <button className={`button ${enough ? "primary" : "secondary"}`} disabled={!enough} onClick={() => void redeem(reward.slug)}>
                  {enough ? "Redeem reward" : `${reward.credits_required - credits} credits remaining`}
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
