"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import TrophyEmblem from "@/components/TrophyEmblem";
import styles from "./DashboardCollectorSummary.module.css";

type Loyalty = {
  lifetime_xp: number;
  supply_credits: number;
  consecutive_paid_months: number;
  xp_multiplier: number;
};

type FeaturedTrophy = {
  trophy_id: string;
  slug: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  featured_slot: number;
};

function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
}

function nextLevelXp(level: number) {
  return Math.pow(level, 2) * 100;
}

export default function DashboardCollectorSummary() {
  const supabase = useMemo(() => getSupabase(), []);
  const [loyalty, setLoyalty] = useState<Loyalty>({
    lifetime_xp: 0,
    supply_credits: 0,
    consecutive_paid_months: 0,
    xp_multiplier: 1,
  });
  const [trophies, setTrophies] = useState<FeaturedTrophy[]>([]);

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
        (supabase as any).rpc("get_my_featured_trophies"),
      ]);

      if (!loyaltyResult.error && loyaltyResult.data) {
        setLoyalty(loyaltyResult.data as Loyalty);
      }

      if (!trophyResult.error) {
        setTrophies((trophyResult.data ?? []) as FeaturedTrophy[]);
      }
    }

    void load();
  }, []);

  const level = levelFromXp(loyalty.lifetime_xp);
  const currentFloor = Math.pow(level - 1, 2) * 100;
  const nextFloor = nextLevelXp(level);
  const progress = Math.max(
    0,
    Math.min(
      100,
      ((loyalty.lifetime_xp - currentFloor) /
        Math.max(1, nextFloor - currentFloor)) *
        100,
    ),
  );

  return (
    <section className={styles.card}>
      <div className={styles.levelBlock}>
        <p>COLLECTOR</p>
        <strong>Level {level}</strong>
        <span>
          {Math.max(0, nextFloor - loyalty.lifetime_xp).toLocaleString()} XP
          to next level
        </span>
      </div>

      <div className={styles.progressBlock}>
        <div className={styles.progressLabel}>
          <span>{loyalty.lifetime_xp.toLocaleString()} XP</span>
          <span>{nextFloor.toLocaleString()} XP</span>
        </div>

        <div className={styles.track}>
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className={styles.metrics}>
          <span>
            <small>CREDITS</small>
            <b>{loyalty.supply_credits}</b>
          </span>
          <span>
            <small>MULTIPLIER</small>
            <b>{Number(loyalty.xp_multiplier).toFixed(2)}×</b>
          </span>
          <span>
            <small>STREAK</small>
            <b>{loyalty.consecutive_paid_months} mo.</b>
          </span>
        </div>
      </div>

      <div className={styles.trophyBlock}>
        <small>FEATURED</small>

        <div className={styles.trophies}>
          {[0, 1, 2].map((slot) => {
            const trophy = trophies.find(
              (item) => item.featured_slot === slot + 1,
            );

            return (
              <span
                key={slot}
                className={`${styles.trophy} ${
                  trophy ? styles[trophy.rarity] : styles.empty
                }`}
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

        <div className={styles.links}>
          <Link href="/rewards">XP & rewards</Link>
          <Link href="/trophies">Trophies</Link>
        </div>
      </div>
    </section>
  );
}
