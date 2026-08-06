import LegalPage from "@/components/LegalPage";

export default function Page() {
  return (
    <LegalPage eyebrow="SUPPORT" title="Frequently Asked Questions">
      <section>
        <h2>What does my membership include?</h2>
        <p>
          One qualifying curated CS2 item during each successfully paid active
          billing cycle, private collection tracking, and access to the member
          features available for your account.
        </p>
      </section>

      <section>
        <h2>How is the item value determined?</h2>
        <p>
          Each tier has a published minimum Steam Community Market reference
          value measured when the item is assigned for fulfillment. Market
          prices may change afterward.
        </p>
      </section>

      <section>
        <h2>What is Lifetime XP?</h2>
        <p>
          Lifetime XP is permanent profile progression used for levels,
          trophies, titles, and community recognition. It has no cash value.
        </p>
      </section>

      <section>
        <h2>What is the loyalty multiplier?</h2>
        <p>
          Consecutive paid cycles can increase recurring-payment XP up to the
          current permanent cap of 1.25× after twelve paid months. Temporary
          events may separately advertise a limited 2× XP rate.
        </p>
      </section>

      <section>
        <h2>Are Supply Credits the same as XP?</h2>
        <p>
          No. Supply Credits are a separate, slowly earned reward balance. They
          are not affected by the XP multiplier and cannot be withdrawn as
          cash.
        </p>
      </section>

      <section>
        <h2>Can I cancel?</h2>
        <p>
          Yes. Cancellation prevents future renewal but does not automatically
          reverse a cycle that has already been successfully paid.
        </p>
      </section>

      <section>
        <h2>Will Strafe Crate ask for my Steam password?</h2>
        <p>
          No. Never provide a Steam password, Steam Guard code, session cookie,
          or API key to Strafe Crate or another community member.
        </p>
      </section>
      <section>
        <h2>Multiple-skin fulfillment</h2>
        <p>
          A membership drop may be fulfilled with one skin or divided across several skins when necessary to meet the applicable membership value, inventory availability, or upgrade requirements. Each delivered item will appear in the member’s order history.
        </p>
      </section>
    </LegalPage>
  );
}
