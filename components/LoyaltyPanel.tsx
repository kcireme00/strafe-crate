"use client";

import Link from "next/link";

type LoyaltyAccount = {
  lifetime_xp: number;
  supply_credits: number;
  consecutive_paid_months: number;
  xp_multiplier: number;
};

function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
}

function nextLevelXp(level: number) {
  return Math.pow(level, 2) * 100;
}

export default function LoyaltyPanel({
  loyalty,
}: {
  loyalty: LoyaltyAccount | null;
}) {
  const xp = loyalty?.lifetime_xp ?? 0;
  const level = levelFromXp(xp);
  const currentLevelFloor = Math.pow(Math.max(0, level - 1), 2) * 100;
  const nextFloor = nextLevelXp(level);
  const progress =
    nextFloor === currentLevelFloor
      ? 0
      : Math.min(
          100,
          ((xp - currentLevelFloor) / (nextFloor - currentLevelFloor)) * 100,
        );

  const credits = loyalty?.supply_credits ?? 0;
  const creditValue = credits * 0.175;

  return (
    <section className="panel loyalty-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">COLLECTOR PROGRESSION</p>
          <h2>Level {level}</h2>
          <p>
            Lifetime XP is permanent profile progression. Supply Credits are a
            separate, slowly earned reward balance.
          </p>
        </div>

        <Link className="button secondary" href="/rewards">
          View rewards
        </Link>
      </div>

      <div className="loyalty-metrics">
        <article>
          <small>LIFETIME XP</small>
          <strong>{xp.toLocaleString()} XP</strong>
          <span>
            {Math.max(0, nextFloor - xp).toLocaleString()} XP to Level{" "}
            {level + 1}
          </span>
        </article>

        <article>
          <small>SUPPLY CREDITS</small>
          <strong>{credits}</strong>
          <span>
            Estimated reward contribution: ${creditValue.toFixed(2)}
          </span>
        </article>

        <article>
          <small>LOYALTY MULTIPLIER</small>
          <strong>
            {Number(loyalty?.xp_multiplier ?? 1).toFixed(2)}×
          </strong>
          <span>Permanent loyalty multiplier caps at 1.25× after 12 paid months</span>
        </article>

        <article>
          <small>PAID STREAK</small>
          <strong>{loyalty?.consecutive_paid_months ?? 0} months</strong>
          <span>Supply Credits are never multiplied</span>
        </article>
      </div>

      <div className="xp-progress-block">
        <div className="xp-progress-label">
          <span>Level {level}</span>
          <span>Level {level + 1}</span>
        </div>

        <div className="xp-progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
    </section>
  );
}
