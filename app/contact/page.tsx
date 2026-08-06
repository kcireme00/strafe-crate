import LegalPage from "@/components/LegalPage";

const SUPPORT_EMAIL = "strafecrate@gmail.com";

export default function Page() {
  return (
    <LegalPage eyebrow="SUPPORT" title="Contact Strafe Crate">
      <section>
        <h2>Account, membership, and fulfillment support</h2>
        <p>
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> for all
          account, membership, fulfillment, upgrade, reward, and general
          questions. Include the email address used for your Strafe Crate
          account.
        </p>
        <p>
          Never send a Steam password, Steam Guard code, session cookie, API
          key, or complete payment-card details.
        </p>
      </section>

      <section>
        <h2>Billing requests</h2>
        <p>
          For billing help, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          and include the account email, payment date, and invoice or receipt
          identifier when available.
        </p>
      </section>

      <section>
        <h2>Community and security reports</h2>
        <p>
          Use the in-chat report control for individual messages. For urgent
          account-security or moderation concerns, email
          {" "}<a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
