"use client";

import TrophyEmblem from "@/components/TrophyEmblem";
import styles from "./CommunityIdentity.module.css";

type Props = {
  displayName: string;
  tierLabel?: string | null;
  tierColor?: string | null;
  level?: number | null;
  trophySlug?: string | null;
  trophyName?: string | null;
  trophyRarity?: "common" | "rare" | "epic" | "legendary" | null;
  onClick?: () => void;
};

export default function CommunityIdentity({
  displayName,
  tierLabel,
  tierColor,
  level,
  trophySlug,
  trophyName,
  trophyRarity,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      className={styles.identity}
      onClick={onClick}
      style={
        {
          "--member-tier-color": tierColor || "#ff7628",
        } as React.CSSProperties
      }
    >
      <span className={styles.name}>{displayName}</span>

      {level != null && (
        <span className={styles.level}>Level {level}</span>
      )}

      {tierLabel && (
        <span className={styles.tier}>{tierLabel}</span>
      )}

      {trophySlug && (
        <span
          className={`${styles.trophy} ${
            trophyRarity ? styles[trophyRarity] : ""
          }`}
          title={trophyName ?? "Featured trophy"}
        >
          <TrophyEmblem
            trophy={trophySlug}
            className={styles.emblem}
          />
        </span>
      )}
    </button>
  );
}
