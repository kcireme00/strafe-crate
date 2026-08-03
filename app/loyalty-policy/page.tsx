import LegalPage from "@/components/LegalPage";

export default function Page() {
  return (
    <LegalPage
      eyebrow="COLLECTOR PROGRESSION"
      title="XP and Rewards Policy"
    >
      <section>
        <h2>1. Lifetime XP</h2>
        <p>
          Lifetime XP is a non-transferable account progression measurement.
          It determines a member's displayed level and may unlock profile
          titles, visual effects, trophies, community recognition, or other
          cosmetic features.
        </p>
        <p>
          XP has no cash value, cannot be withdrawn, cannot be transferred,
          cannot be sold back to Strafe Crate, and cannot be exchanged for
          Steam Wallet funds or legal tender.
        </p>
      </section>

      <section>
        <h2>2. Loyalty multiplier</h2>
        <p>
          Successful consecutive paid membership cycles may increase the
          amount of Lifetime XP earned from future recurring payments. The
          current permanent loyalty schedule is:
        </p>

        <div className="policy-table">
          <div><b>Months 1–2</b><span>1.00× XP</span><strong>Starting rate</strong></div>
          <div><b>Months 3–5</b><span>1.05× XP</span><strong>Loyalty rate</strong></div>
          <div><b>Months 6–8</b><span>1.10× XP</span><strong>Collector rate</strong></div>
          <div><b>Months 9–11</b><span>1.15× XP</span><strong>Veteran rate</strong></div>
          <div><b>Month 12+</b><span>1.25× XP</span><strong>Current permanent cap</strong></div>
        </div>

        <p>
          Strafe Crate may separately run temporary community events that award
          additional XP or use a promotional XP rate, including a stated 2× XP
          event. Temporary event rates do not increase Supply Credits and do
          not permanently alter the loyalty multiplier.
        </p>
      </section>

      <section>
        <h2>3. Supply Credits</h2>
        <p>
          Supply Credits are separate from XP. They may be earned after
          qualifying successful recurring membership payments and may be used
          only for rewards listed in the Strafe Rewards catalog.
        </p>

        <div className="policy-table">
          <div><b>Recruit</b><span>1 credit</span><strong>About $0.18 estimated contribution</strong></div>
          <div><b>Operative</b><span>1 credit</span><strong>About $0.18 estimated contribution</strong></div>
          <div><b>Vanguard</b><span>2 credits</span><strong>About $0.35 estimated contribution</strong></div>
          <div><b>Elite</b><span>3 credits</span><strong>About $0.53 estimated contribution</strong></div>
          <div><b>Master</b><span>4 credits</span><strong>About $0.70 estimated contribution</strong></div>
          <div><b>Prestige</b><span>6 credits</span><strong>About $1.05 estimated contribution</strong></div>
        </div>

        <p>
          The displayed estimated contribution is informational. Supply Credits
          are not cash, stored value, a bank balance, a gift card, or a promise
          that a reward can be resold for a stated amount. Credits are not
          multiplied by the XP multiplier.
        </p>
      </section>

      <section>
        <h2>4. Rewards and redemption</h2>
        <p>
          Reward descriptions, required credits, estimated reward values,
          availability, and fulfillment conditions are displayed before
          redemption. A submitted redemption may be reviewed for account
          eligibility, fraud, duplicate requests, inventory availability, and
          trade restrictions.
        </p>
        <p>
          Unless otherwise stated, community games and events award XP,
          trophies, titles, or profile cosmetics—not Supply Credits.
        </p>
      </section>

      <section>
        <h2>5. Changes and corrections</h2>
        <p>
          Strafe Crate may correct mistaken, duplicated, fraudulent, or
          improperly generated XP, credits, trophies, or rewards. Future earning
          rates and reward catalogs may change prospectively with notice posted
          on the service.
        </p>
      </section>
    </LegalPage>
  );
}
