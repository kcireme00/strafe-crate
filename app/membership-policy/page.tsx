import LegalPage from "@/components/LegalPage";

const tiers = [
  ["Recruit", "$25", "$21 minimum", "84%", "16%"],
  ["Operative", "$50", "$43 minimum", "86%", "14%"],
  ["Vanguard", "$75", "$66 minimum", "88%", "12%"],
  ["Elite", "$100", "$90 minimum", "90%", "10%"],
  ["Master", "$150", "$138 minimum", "92%", "8%"],
  ["Prestige", "$200", "$188 minimum", "94%", "6%"],
];

export default function Page() {
  return (
    <LegalPage
      eyebrow="MEMBERSHIP POLICY"
      title="Membership and Value Policy"
    >
      <section>
        <h2>1. The membership</h2>
        <p>
          Strafe Crate is a recurring digital-item collection membership.
          During each successfully paid billing cycle, Strafe Crate assigns one
          eligible Counter-Strike 2 item for delivery through a Steam trade
          offer.
        </p>
      </section>

      <section>
        <h2>2. Transparent tier value</h2>
        <p>
          Each tier has a published minimum Steam Community Market reference
          value. The remaining portion of the membership price supports item
          sourcing, payment processing, fraud prevention, customer support,
          platform operations, fulfillment labor, development, and other costs
          of operating the service.
        </p>

        <div className="policy-table">
          {tiers.map(([name, price, minimum, collectible, operations]) => (
            <div key={name}>
              <b>{name}</b>
              <span>{price}</span>
              <strong>{minimum}</strong>
              <span>{collectible} toward published minimum value</span>
              <span>{operations} for service and operations</span>
            </div>
          ))}
        </div>

        <p>
          The published minimum is the minimum reference-value floor, not a
          representation of Strafe Crate's exact acquisition cost or a
          dollar-for-dollar segregation of customer funds.
        </p>
      </section>

      <section>
        <h2>3. Steam reference value</h2>
        <p>
          Steam Reference Value means the displayed U.S.-dollar buyer price for
          the applicable item on the Steam Community Market when Strafe Crate
          records and assigns the item for fulfillment.
        </p>
        <p>
          Reference value is not cash value, guaranteed resale value,
          investment value, or a promise that the item can immediately be sold
          for that amount. Digital-item prices may rise or fall before or after
          delivery.
        </p>
      </section>

      <section>
        <h2>4. Selection and rotation</h2>
        <p>
          Items are selected according to the applicable tier value floor,
          member history, eligible weapon rotation, inventory availability, and
          fulfillment requirements. The service may use automated selection
          among qualifying items.
        </p>
        <p>
          Strafe Crate does not publish prize odds, jackpots, cash multipliers,
          wagering outcomes, or paid rerolls. A qualifying substitution may be
          necessary because of inventory availability, Steam restrictions, or
          operational issues.
        </p>
      </section>

      <section>
        <h2>5. No cash redemption</h2>
        <p>
          Membership items cannot be redeemed from Strafe Crate for cash. Use
          of Steam and the Steam Community Market remains subject to Valve's
          agreements, fees, restrictions, and technical availability.
        </p>
      </section>
    </LegalPage>
  );
}
