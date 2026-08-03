import LegalPage from "@/components/LegalPage";

export default function Page() {
  return (
    <LegalPage
      eyebrow="MEMBER COMMUNITY"
      title="Community Guidelines"
    >
      <section>
        <h2>1. Respect other members</h2>
        <p>
          Do not harass, threaten, discriminate against, stalk, impersonate, or
          deliberately humiliate another member. Do not organize targeted abuse
          or encourage others to violate these rules.
        </p>
      </section>

      <section>
        <h2>2. Account and trade safety</h2>
        <p>
          Never request another member's Steam password, Steam Guard code,
          session cookie, API key, payment information, or login credentials.
          Do not post fraudulent trade links, phishing links, malware, or
          impersonated staff messages.
        </p>
      </section>

      <section>
        <h2>3. Spam and manipulation</h2>
        <p>
          Do not flood chat, automate messages, manipulate games, collude to
          farm XP, create duplicate accounts to gain rewards, or exploit bugs.
          Community XP may be capped and suspicious activity may be reviewed.
        </p>
      </section>

      <section>
        <h2>4. Admin and moderation tools</h2>
        <p>
          Administrators may pin announcements, host events, award XP or
          trophies, delete messages, restrict chat access, mute or suspend
          accounts, and correct rewards when reasonably necessary to operate
          and protect the community.
        </p>
      </section>

      <section>
        <h2>5. Community events</h2>
        <p>
          Event rules, entry requirements, timing, scoring, XP awards, trophies,
          and winner-selection methods will be displayed for the applicable
          event. Unless expressly stated otherwise, event rewards are
          non-cash XP, titles, trophies, or profile cosmetics.
        </p>
      </section>
    </LegalPage>
  );
}
