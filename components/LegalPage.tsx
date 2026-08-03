import Link from "next/link";

export default function LegalPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="legal-shell shell">
      <header className="legal-hero">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-updated">Effective August 2026</p>
      </header>

      <div className="legal-layout">
        <nav className="legal-nav" aria-label="Policy navigation">
          <strong>Policies</strong>
          <Link href="/membership-policy">Membership and value</Link>
          <Link href="/billing">Billing and cancellation</Link>
          <Link href="/refunds">Refunds and fulfillment</Link>
          <Link href="/upgrades">Upgrade program</Link>
          <Link href="/loyalty-policy">XP and rewards</Link>
          <Link href="/community-guidelines">Community guidelines</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
        </nav>

        <article className="legal-content">{children}</article>
      </div>
    </main>
  );
}
