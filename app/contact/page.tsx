import LegalPage from "@/components/LegalPage";

export default function Page() {
  return (
    <LegalPage eyebrow="SUPPORT" title="Contact Strafe Crate">
      <section>
        <h2>Account and membership support</h2>
        <p>
          Add your official support email address here before accepting public
          payments. Include the email address used for the account, but never
          send a Steam password, Steam Guard code, session cookie, or API key.
        </p>
      </section>

      <section>
        <h2>Billing requests</h2>
        <p>
          For billing requests, include the account email, payment date, and
          invoice or receipt identifier when available. Do not send complete
          payment-card details.
        </p>
      </section>

      <section>
        <h2>Community reports</h2>
        <p>
          Use the in-chat report control for individual messages. Urgent
          account-security issues should be reported through the official
          support channel.
        </p>
      </section>
    </LegalPage>
  );
}
