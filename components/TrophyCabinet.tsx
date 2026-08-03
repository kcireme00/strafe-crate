"use client";

type Trophy = {
  id: string;
  featured_slot: number | null;
  awarded_at: string;
  trophy_definitions: {
    name: string;
    description: string;
    icon: string;
    rarity: string;
  } | null;
};

export default function TrophyCabinet({ trophies }: { trophies: Trophy[] }) {
  const featured = trophies
    .filter((item) => item.featured_slot)
    .sort((a, b) => (a.featured_slot ?? 9) - (b.featured_slot ?? 9));

  return (
    <section className="panel trophy-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">PROFILE FLEX</p>
          <h2>Trophy cabinet</h2>
          <p>Feature up to three trophies on your public player card and community profile.</p>
        </div>
        <span className="viz-badge">{trophies.length} unlocked</span>
      </div>

      {trophies.length ? (
        <>
          <div className="featured-trophies">
            {[1, 2, 3].map((slot) => {
              const trophy = featured.find((item) => item.featured_slot === slot);
              return (
                <article className={`featured-trophy ${trophy ? `rarity-${trophy.trophy_definitions?.rarity}` : "empty"}`} key={slot}>
                  <span className="trophy-icon">{trophy?.trophy_definitions?.icon ?? "○"}</span>
                  <small>FEATURED SLOT {slot}</small>
                  <strong>{trophy?.trophy_definitions?.name ?? "Empty slot"}</strong>
                  <p>{trophy?.trophy_definitions?.description ?? "Feature an unlocked trophy here later."}</p>
                </article>
              );
            })}
          </div>

          <div className="trophy-grid">
            {trophies.map((item) => (
              <article className={`trophy-item rarity-${item.trophy_definitions?.rarity}`} key={item.id}>
                <span className="trophy-icon">{item.trophy_definitions?.icon}</span>
                <div>
                  <strong>{item.trophy_definitions?.name}</strong>
                  <p>{item.trophy_definitions?.description}</p>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-trophy-cabinet">
          <span>◇</span>
          <div>
            <strong>Your cabinet is ready.</strong>
            <p>Trophies unlock through paid streaks, completed rotations, upgrades, and positive community milestones.</p>
          </div>
        </div>
      )}
    </section>
  );
}
