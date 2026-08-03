import LegalPage from "@/components/LegalPage";

export default function Page() {
  return (
    <LegalPage eyebrow="UPGRADE PROGRAM" title="Upgrade Policy">
      <section>
        <h2>1. Eligible memberships</h2>
        <p>
          Upgrade requests are available only for the membership tiers and
          billing cycles identified as upgrade eligible, currently including
          Elite, Master, and Prestige unless otherwise displayed.
        </p>
      </section>

      <section>
        <h2>2. Eligible returned items</h2>
        <p>
          The returned item must have originally been supplied by Strafe Crate,
          match the submitted request, remain transferable, and be received
          through the official Strafe Crate Steam trade link by the applicable
          cutoff.
        </p>
      </section>

      <section>
        <h2>3. Review and timing</h2>
        <p>
          Requests may be reviewed for item identity, trade completion,
          condition, restrictions, fraud, and fulfillment availability. Items
          received after a cutoff may be processed during a later cycle.
        </p>
      </section>

      <section>
        <h2>4. No cash balance</h2>
        <p>
          Upgrade value is applied only according to the published upgrade
          program. It is not a cash balance, withdrawal right, or promise of a
          cash payment for any difference.
        </p>
      </section>
    </LegalPage>
  );
}
