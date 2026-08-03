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
    const width = 330;
    const gap = 10;
    const viewportPadding = 12;

    let left = anchor.right + gap;
    if (left + width > window.innerWidth - viewportPadding) {
      left = Math.max(viewportPadding, anchor.left - width - gap);
    }

    let top = anchor.top - 8;
    const estimatedHeight = 255;
    if (top + estimatedHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, window.innerHeight - estimatedHeight - viewportPadding);
    }

    return { left, top };
  }, [anchor]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
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
      className={`chat-profile-popover ${tierClass(card.tier_name)}`}
      style={{ left: position.left, top: position.top }}
      role="dialog"
      aria-label={`${card.display_name} player card`}
    >
      <div className="chat-profile-popover-top">
        <div>
          <small>STRAFE CRATE PLAYER</small>
          <h3>{card.display_name}</h3>
          <p>
            Level {card.level} · {card.tier_name ?? "Membership pending"}
          </p>
        </div>

        {card.tier_name ? (
          <TierEmblem tier={card.tier_name} className="chat-profile-popover-emblem" />
        ) : (
          <span className="chat-profile-popover-pending">◇</span>
        )}
      </div>

      <div className="chat-profile-popover-stats">
        <span>
          <small>XP</small>
          <strong>{card.lifetime_xp.toLocaleString()}</strong>
        </span>
        <span>
          <small>STREAK</small>
          <strong>{card.consecutive_paid_months} mo.</strong>
        </span>
        <span>
          <small>MULTIPLIER</small>
          <strong>{Number(card.xp_multiplier).toFixed(2)}×</strong>
        </span>
      </div>

      <div className="chat-profile-popover-trophies">
        <small>FEATURED</small>
        <div>
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
    </section>
  );
}
