"use client";

import { useEffect, useMemo, useRef } from "react";
import TierEmblem from "@/components/TierEmblem";

type PublicCard = {
  user_id: string;
  display_name: string;
  tier_name: string | null;
  lifetime_xp: number;
  supply_credits: number;
  consecutive_paid_months: number;
  xp_multiplier: number;
  level: number;
  member_since: string;
  trophies: Array<{
    name: string;
    description: string;
    icon: string;
    rarity: string;
    featured_slot: number | null;
  }>;
};

function tierClass(tier: string | null) {
  return `popover-tier-${(tier ?? "pending")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;
}

export default function PublicPlayerCard({
  card,
  anchor,
  onClose,
}: {
  card: PublicCard;
  anchor: DOMRect;
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement | null>(null);

  const position = useMemo(() => {
    const width = 455;
    const estimatedHeight = 205;
    const gap = 12;
    const edge = 12;

    let left = anchor.right + gap;
    let side: "right" | "left" = "right";

    if (left + width > window.innerWidth - edge) {
      left = Math.max(edge, anchor.left - width - gap);
      side = "left";
    }

    let top = anchor.top - 18;
    if (top + estimatedHeight > window.innerHeight - edge) {
      top = Math.max(edge, window.innerHeight - estimatedHeight - edge);
    }

    return { left, top, side };
  }, [anchor]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const featured = (card.trophies ?? [])
    .filter((item) => item.featured_slot)
    .sort((a, b) => (a.featured_slot ?? 9) - (b.featured_slot ?? 9))
    .slice(0, 3);

  return (
    <section
      ref={ref}
      className={`chat-profile-popover wide ${tierClass(card.tier_name)} pointer-${position.side}`}
      style={{ left: position.left, top: position.top }}
      role="dialog"
      aria-label={`${card.display_name} player card`}
    >
      <div className="chat-profile-main">
        <div className="chat-profile-copy">
          <small>STRAFE CRATE PLAYER</small>
          <h3>{card.display_name}</h3>
          <p>
            Level {card.level}
            <span aria-hidden="true"> · </span>
            {card.tier_name ?? "Membership pending"}
          </p>

          <div className="chat-profile-inline-stats">
            <span><b>{card.lifetime_xp.toLocaleString()}</b><em>XP</em></span>
            <span><b>{card.consecutive_paid_months} mo.</b><em>STREAK</em></span>
            <span><b>{Number(card.xp_multiplier).toFixed(2)}×</b><em>MULTIPLIER</em></span>
          </div>
        </div>

        <div className="chat-profile-rank">
          {card.tier_name ? (
            <TierEmblem tier={card.tier_name} className="chat-profile-popover-emblem" />
          ) : (
            <span className="chat-profile-popover-pending">◇</span>
          )}

          <div className="chat-profile-mini-trophies">
            {[0, 1, 2].map((index) => {
              const trophy = featured[index];
              return (
                <span
                  key={index}
                  className={trophy ? `rarity-${trophy.rarity}` : "empty"}
                  title={trophy?.description ?? "Empty trophy slot"}
                >
                  {trophy?.icon ?? "○"}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
