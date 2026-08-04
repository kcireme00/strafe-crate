"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import LoyaltyPanel from "@/components/LoyaltyPanel";
import TrophyCabinet from "@/components/TrophyCabinet";
import { getSupabase } from "@/lib/supabase";
import styles from "./RewardsHub.module.css";

type Loyalty = {
  lifetime_xp: number;
  supply_credits: number;
  consecutive_paid_months: number;
  xp_multiplier: number;
};

function RewardsContent() {
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
          <p>COLLECTOR SYSTEM</p>
          <h1>Rewards & Progression</h1>
          <span>
            Manage XP, Supply Credits, achievements, and featured trophies
            without cluttering your monthly dashboard.
          </span>
        </header>

        <div className={styles.stack}>
          <LoyaltyPanel loyalty={loyalty} />
          <TrophyCabinet />

          <section className={styles.placeholder}>
            <p>REWARD SHOP</p>
            <h2>Supply rewards</h2>
            <span>
              Redeem Supply Credits for available bonus rewards as the catalog
              becomes available.
            </span>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function RewardsHub() {
  return (
    <AuthGuard>
      {() => <RewardsContent />}
    </AuthGuard>
  );
}
