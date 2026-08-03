import LegalPage from "@/components/LegalPage";

export default function Page() {
  return (
    <LegalPage
      eyebrow="FULFILLMENT POLICY"
      title="Refunds and Fulfillment"
    >
      <section>
        <h2>1. General rule</h2>
        <p>
          Successfully processed membership payments are generally
          non-refundable after the billing cycle begins, except where required
          by applicable law or expressly stated otherwise.
        </p>
      </section>

      <section>
        <h2>2. Unfulfilled cycles</h2>
        <p>
          If Strafe Crate cannot fulfill a successfully paid cycle, Strafe
          Crate may provide a qualifying replacement, account credit,
          rescheduled fulfillment, or refund as appropriate to the
          circumstances and applicable law.
        </p>
      </section>

      <section>
        <h2>3. Member responsibility</h2>
        <p>
          Members must maintain an accurate Steam trade URL, an account capable
          of trading, and timely access to accept a valid trade offer. Delays
          caused by trade holds, account restrictions, inaccurate information,
          or failure to accept an offer may extend fulfillment.
        </p>
      </section>

      <section>
        <h2>4. Reward redemptions</h2>
        <p>
          Supply Credit redemptions are generally final after approval or
          fulfillment. Credits may be restored when a redemption is rejected or
          cannot be fulfilled, depending on the circumstances.
        </p>
      </section>
    </LegalPage>
  );
}
