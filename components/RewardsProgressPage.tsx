"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import LoyaltyPanel from "@/components/LoyaltyPanel";
import { getSupabase } from "@/lib/supabase";
import RewardCatalog from "@/components/RewardCatalog";
import styles from "./RewardsProgressPage.module.css";

type Loyalty = {
  lifetime_xp: number;
  supply_credits: number;
  consecutive_paid_months: number;
  xp_multiplier: number;
};

function Content() {
  const supabase = useMemo(() => getSupabase(), []);
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("loyalty_accounts")
        .select(
          "lifetime_xp,supply_credits,consecutive_paid_months,xp_multiplier",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      setLoyalty((data as Loyalty | null) ?? null);
    }

    void load();
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <p>COLLECTOR PROGRESSION</p>
          <h1>XP & Rewards</h1>
          <span>
            Levels, Lifetime XP, loyalty multiplier, Supply Credits, and
            reward redemptions.
          </span>
        </header>

        <div className={styles.stack}>
          <LoyaltyPanel loyalty={loyalty} />

          <RewardCatalog />
        </div>
      </div>
    </main>
  );
}

export default function RewardsProgressPage() {
  return (
    <AuthGuard>
      {() => <Content />}
    </AuthGuard>
  );
}
