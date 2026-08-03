import LegalPage from "@/components/LegalPage";

export default function Page() {
  return (
    <LegalPage
      eyebrow="SUBSCRIPTION POLICY"
      title="Billing and Cancellation"
    >
      <section>
        <h2>1. Automatic renewal</h2>
        <p>
          Memberships renew automatically at the disclosed price and frequency
          until cancelled. Applicable taxes and clearly disclosed charges may
          be added.
        </p>
      </section>

      <section>
        <h2>2. Billing cycle</h2>
        <p>
          Billing normally occurs on the first day of the active cycle. A
          membership purchased after the monthly enrollment cutoff may begin
          with the following cycle, as displayed before checkout.
        </p>
      </section>

      <section>
        <h2>3. Authorization</h2>
        <p>
          By completing checkout, you authorize recurring billing and confirm
          that you reviewed the membership price, renewal frequency, value
          policy, cancellation method, refund policy, and linked Terms.
        </p>
      </section>

      <section>
        <h2>4. Cancellation</h2>
        <p>
          You may cancel future renewal through the available account or
          billing-portal controls. Cancellation prevents future charges but
          does not automatically cancel or refund a cycle that has already been
          successfully paid.
        </p>
      </section>

      <section>
        <h2>5. Failed payments</h2>
        <p>
          Failed, disputed, reversed, or unpaid charges may pause membership,
          fulfillment, XP awards, Supply Credit awards, community eligibility,
          and other member benefits until the account is restored.
        </p>
      </section>
    </LegalPage>
  );
}
