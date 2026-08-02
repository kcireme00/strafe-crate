import Link from "next/link";

export default function LegalPage({
  eyebrow,
  title,
  updated = "August 1, 2026",
  children,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="legal-shell shell">
      <header className="legal-hero">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-updated">Last updated {updated}</p>
      </header>
      <div className="legal-layout">
        <aside className="legal-nav" aria-label="Policy navigation">
          <strong>Policies</strong>
          <Link href="/membership-policy">Membership and Value</Link>
          <Link href="/billing">Billing and Cancellation</Link>
          <Link href="/refunds">Refunds and Fulfillment</Link>
          <Link href="/upgrades">Upgrade Program</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
        </aside>
        <article className="legal-content">{children}</article>
      </div>
    </main>
  );
}
