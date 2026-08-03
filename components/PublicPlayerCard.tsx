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

  return (
    <div className="player-card-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="public-player-card"
        role="dialog"
        aria-modal="true"
        aria-label={`${card.display_name} player card`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="player-card-close" type="button" onClick={onClose}>×</button>

        <div className="public-card-top">
          <div>
            <small>STRAFE CRATE PLAYER</small>
            <h2>{card.display_name}</h2>
            <p>Level {card.level} · {card.tier_name ?? "Membership pending"}</p>
          </div>
          {card.tier_name && <TierEmblem tier={card.tier_name} className="public-card-emblem" />}
        </div>

        <div className="public-card-stats">
          <div><small>LIFETIME XP</small><strong>{card.lifetime_xp.toLocaleString()}</strong></div>
          <div><small>PAID STREAK</small><strong>{card.consecutive_paid_months} mo.</strong></div>
          <div><small>XP MULTIPLIER</small><strong>{Number(card.xp_multiplier).toFixed(2)}×</strong></div>
        </div>

        <div className="public-card-trophies">
          <small>FEATURED TROPHIES</small>
          <div>
            {[0, 1, 2].map((index) => {
              const trophy = featured[index];
              return (
                <span className={trophy ? `rarity-${trophy.rarity}` : "empty"} key={index} title={trophy?.description}>
                  <b>{trophy?.icon ?? "○"}</b>
                  {trophy?.name ?? "Empty"}
                </span>
              );
            })}
          </div>
        </div>

        <p className="public-card-member-since">
          Member since {new Date(card.member_since).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </section>
    </div>
  );
}
