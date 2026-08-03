"use client";

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
  return `player-tier-${(tier ?? "pending")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`;
}

export default function PublicPlayerCard({
  card,
  onClose,
}: {
  card: PublicCard;
  onClose: () => void;
}) {
  const featured = (card.trophies ?? [])
    .filter((item) => item.featured_slot)
    .sort((a, b) => (a.featured_slot ?? 9) - (b.featured_slot ?? 9))
    .slice(0, 3);

  const memberSince = new Date(card.member_since).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="player-card-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className={`compact-player-card ${tierClass(card.tier_name)}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${card.display_name} player card`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="compact-player-close"
          type="button"
          onClick={onClose}
          aria-label="Close player card"
        >
          ×
        </button>

        <div className="compact-player-sheen" aria-hidden="true" />

        <div className="compact-player-header">
          <div className="compact-player-brand">
            <span className="compact-player-mark">SC</span>
            <div>
              <small>STRAFE CRATE</small>
              <strong>
                {card.tier_name
                  ? `${card.tier_name.toUpperCase()} MEMBER`
                  : "MEMBERSHIP PENDING"}
              </strong>
            </div>
          </div>

          {card.tier_name ? (
            <TierEmblem
              tier={card.tier_name}
              className="compact-player-emblem"
            />
          ) : (
            <span className="compact-pending-emblem" aria-hidden="true">
              ◇
            </span>
          )}
        </div>

        <div className="compact-player-identity">
          <small>PLAYER</small>
          <h2>{card.display_name}</h2>
          <p>
            Level {card.level}
            <span aria-hidden="true"> · </span>
            {card.tier_name ?? "Membership pending"}
          </p>
        </div>

        <div className="compact-player-stats">
          <div>
            <small>LIFETIME XP</small>
            <strong>{card.lifetime_xp.toLocaleString()}</strong>
          </div>
          <div>
            <small>PAID STREAK</small>
            <strong>{card.consecutive_paid_months} mo.</strong>
          </div>
          <div>
            <small>XP MULTIPLIER</small>
            <strong>{Number(card.xp_multiplier).toFixed(2)}×</strong>
          </div>
        </div>

        <div className="compact-player-footer">
          <div className="compact-featured-trophies">
            <small>FEATURED TROPHIES</small>
            <div>
              {[0, 1, 2].map((index) => {
                const trophy = featured[index];

                return (
                  <span
                    className={
                      trophy
                        ? `compact-trophy rarity-${trophy.rarity}`
                        : "compact-trophy empty"
                    }
                    key={index}
                    title={trophy?.description ?? "Empty trophy slot"}
                  >
                    <b>{trophy?.icon ?? "○"}</b>
                    <em>{trophy?.name ?? "Empty"}</em>
                  </span>
                );
              })}
            </div>
          </div>

          <p>Member since {memberSince}</p>
        </div>
      </section>
    </div>
  );
}
