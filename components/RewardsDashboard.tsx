"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

type Reward = {
  id: string;
  slug: string;
  name: string;
  description: string;
  credits_required: number;
  estimated_reward_value_cents: number;
};

export default function RewardsDashboard({ user }: { user: User }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [credits, setCredits] = useState(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    const [account, catalog] = await Promise.all([
      supabase.from("loyalty_accounts").select("supply_credits").eq("user_id", user.id).single(),
      supabase.from("reward_catalog").select("id,slug,name,description,credits_required,estimated_reward_value_cents").eq("active", true).order("credits_required"),
    ]);

    if (account.error) {
      setStatus(account.error.message);
    } else {
      const loyaltyAccount = account.data as { supply_credits: number } | null;
      setCredits(loyaltyAccount?.supply_credits ?? 0);
    }

    if (catalog.error) {
      setStatus(catalog.error.message);
    } else {
      const rewardCatalog = (catalog.data ?? []) as Reward[];
      setRewards(rewardCatalog);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function redeem(slug: string) {
    const confirmed = window.confirm("Redeem this reward? Supply Credits will be deducted immediately.");
    if (!confirmed) return;

    setStatus("Submitting redemption...");
    const { error } = await (supabase as any).rpc(
      "redeem_reward",
      { reward_slug: slug },
    );
    if (error) setStatus(error.message);
    else {
      setStatus("Reward redemption submitted. The admin fulfillment queue will review it.");
      await load();
    }
  }

  return (
    <main className="rewards-shell shell">
      <div className="rewards-heading">
        <div>
          <p className="eyebrow">STRAFE REWARDS</p>
          <h1>Supply caches.</h1>
          <p>Credits are earned slowly from successful recurring payments. They are not cash, cannot be withdrawn, and are not affected by the XP multiplier.</p>
        </div>
        <div className="credit-balance">
          <small>AVAILABLE SUPPLY CREDITS</small>
          <strong>{credits}</strong>
          <span>Estimated reward contribution: ${(credits * 0.175).toFixed(2)}</span>
        </div>
      </div>

      <section className="reward-transparency">
        <h2>Conservative loyalty value</h2>
        <p>One Supply Credit currently represents approximately $0.175 of estimated bonus reward contribution. The displayed amount is not cash value, account credit, or a promise of resale value.</p>
        <div className="credit-earning-grid">
          <article><strong>Recruit</strong><span>1 credit · ~$0.18 / renewal</span></article>
          <article><strong>Operative</strong><span>1 credit · ~$0.18 / renewal</span></article>
          <article><strong>Vanguard</strong><span>2 credits · ~$0.35 / renewal</span></article>
          <article><strong>Elite</strong><span>3 credits · ~$0.53 / renewal</span></article>
          <article><strong>Master</strong><span>4 credits · ~$0.70 / renewal</span></article>
          <article><strong>Prestige</strong><span>6 credits · ~$1.05 / renewal</span></article>
        </div>
      </section>

      <section className="reward-grid">
        {rewards.map((reward, index) => {
          const enough = credits >= reward.credits_required;
          return (
            <article className={`reward-card reward-level-${index + 1}`} key={reward.id}>
              <div className="reward-cache-icon">{index === 0 ? "I" : index === 1 ? "II" : "III"}</div>
              <small>SUPPLY CACHE</small>
              <h2>{reward.name}</h2>
              <p>{reward.description}</p>
              <div className="reward-value">
                <div><small>COST</small><strong>{reward.credits_required} credits</strong></div>
                <div><small>ESTIMATED VALUE</small><strong>${(reward.estimated_reward_value_cents / 100).toFixed(2)}</strong></div>
              </div>
              <button className={`button ${enough ? "primary" : "secondary"}`} type="button" disabled={!enough} onClick={() => void redeem(reward.slug)}>
                {enough ? "Redeem reward" : `${reward.credits_required - credits} credits remaining`}
              </button>
            </article>
          );
        })}
      </section>

      {status && <p className="reward-status">{status}</p>}
    </main>
  );
}
