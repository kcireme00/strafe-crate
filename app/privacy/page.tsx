import LegalPage from "@/components/LegalPage";

export default function Page() {
  return (
    <LegalPage eyebrow="PRIVACY POLICY" title="Privacy Policy">
      <section>
        <h2>1. Information we collect</h2>
        <p>
          We may collect your name, display name, email address, account
          identifiers, Steam trade URL, subscription tier,
          billing status, fulfillment history, reward history, XP, trophies,
          community messages, reports, moderation history, and technical
          security logs.
        </p>
      </section>

      <section>
        <h2>2. Information we do not request</h2>
        <p>
          We do not request your Steam password, Steam Guard code, session
          cookie, or private API key. Payment-card information is handled by
          the applicable payment processor rather than stored directly by
          Strafe Crate.
        </p>
      </section>

      <section>
        <h2>3. How information is used</h2>
        <p>
          Information is used to provide accounts, process memberships,
          fulfill trades, operate rewards and progression, display public
          player-card information, moderate the community, prevent fraud,
          provide support, improve the service, and comply with legal
          obligations.
        </p>
      </section>

      <section>
        <h2>4. Public profile information</h2>
        <p>
          Your chosen display name, membership tier, level, Lifetime XP, paid
          streak, XP multiplier, and featured trophies may be visible to signed-
          in community users. Your email, Steam trade URL, payment information,
          and private admin notes are not displayed on public player cards.
        </p>
      </section>

      <section>
        <h2>5. Retention and deletion</h2>
        <p>
          Records may be retained as reasonably necessary for fulfillment,
          accounting, fraud prevention, chargeback defense, moderation,
          security, and legal compliance. Contact support to request access,
          correction, or deletion where applicable.
        </p>
      </section>
    </LegalPage>
  );
}
