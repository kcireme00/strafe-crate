"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import TrophyEmblem from "@/components/TrophyEmblem";
import styles from "./CompactCollectorProgress.module.css";

type Loyalty = {
  lifetime_xp: number;
  supply_credits: number;
  consecutive_paid_months: number;
  xp_multiplier: number;
};

type Trophy = {
  trophy_id: string;
  slug: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  featured_slot: number | null;
};

function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
}

function nextLevelXp(level: number) {
  return Math.pow(level, 2) * 100;
}

export default function CompactCollectorProgress() {
  const supabase = useMemo(() => getSupabase(), []);
  const [loyalty, setLoyalty] = useState<Loyalty>({
    lifetime_xp: 0,
    supply_credits: 0,
    consecutive_paid_months: 0,
    xp_multiplier: 1,
  });
  const [trophies, setTrophies] = useState<Trophy[]>([]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [loyaltyResult, trophyResult] = await Promise.all([
        supabase
          .from("loyalty_accounts")
          .select(
            "lifetime_xp,supply_credits,consecutive_paid_months,xp_multiplier",
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        (supabase as any).rpc("get_my_trophy_cabinet"),
      ]);

      if (!loyaltyResult.error && loyaltyResult.data) {
        setLoyalty(loyaltyResult.data as Loyalty);
      }

      if (!trophyResult.error) {
        setTrophies(
          ((trophyResult.data ?? []) as Trophy[])
            .filter((trophy) => trophy.featured_slot)
            .sort(
              (a, b) =>
                Number(a.featured_slot) - Number(b.featured_slot),
            )
            .slice(0, 3),
        );
      }
    }

    void load();
  }, []);

  const level = levelFromXp(loyalty.lifetime_xp);
  const currentFloor = Math.pow(level - 1, 2) * 100;
  const nextFloor = nextLevelXp(level);
  const progress = Math.min(
    100,
    ((loyalty.lifetime_xp - currentFloor) /
      Math.max(1, nextFloor - currentFloor)) *
      100,
  );

  return (
    <section className={styles.card}>
      <div className={styles.identity}>
        <p>COLLECTOR PROGRESS</p>
        <h2>Level {level}</h2>
        <span>
          {Math.max(0, nextFloor - loyalty.lifetime_xp).toLocaleString()} XP
          to Level {level + 1}
        </span>
      </div>

      <div className={styles.progressColumn}>
        <div className={styles.progressLabels}>
          <span>{loyalty.lifetime_xp.toLocaleString()} XP</span>
          <span>{nextFloor.toLocaleString()} XP</span>
        </div>

        <div className={styles.track}>
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className={styles.metrics}>
          <div>
            <small>SUPPLY CREDITS</small>
            <strong>{loyalty.supply_credits}</strong>
          </div>

          <div>
            <small>MULTIPLIER</small>
            <strong>{Number(loyalty.xp_multiplier).toFixed(2)}×</strong>
          </div>

          <div>
            <small>PAID STREAK</small>
            <strong>{loyalty.consecutive_paid_months} mo.</strong>
          </div>
        </div>
      </div>

      <div className={styles.trophyColumn}>
        <small>FEATURED TROPHIES</small>

        <div className={styles.trophyRow}>
          {[0, 1, 2].map((slot) => {
            const trophy = trophies[slot];

            return (
              <span
                className={
                  trophy
                    ? `${styles.trophy} ${styles[trophy.rarity]}`
                    : `${styles.trophy} ${styles.empty}`
                }
                key={slot}
                title={trophy?.name ?? "Empty trophy slot"}
              >
                {trophy ? (
                  <TrophyEmblem
                    trophy={trophy.slug}
                    className={styles.emblem}
                  />
                ) : (
                  "+"
                )}
              </span>
            );
          })}
        </div>

        <Link href="/rewards">View progression →</Link>
      </div>
    </section>
  );
}
