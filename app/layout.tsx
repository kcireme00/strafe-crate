import type { Metadata } from "next";
import Link from "next/link";
import Brand from "@/components/Brand";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Strafe Crate",
  description: "Premium monthly CS2 skin memberships.",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />

        {children}

        <footer className="site-footer">
          <div className="shell footer-grid">
            <div className="footer-brand-block">
              <Brand />
              <p>
                Premium monthly CS2 skin memberships with transparent value,
                collector progression, and private fulfillment tracking.
              </p>
            </div>

            <div>
              <strong>Explore</strong>
              <Link href="/#plans">Memberships</Link>
              <Link href="/membership-policy">How value works</Link>
              <Link href="/rewards">XP & rewards</Link>
              <Link href="/trophies">Trophies</Link>
              <Link href="/community">Community</Link>
              <Link href="/settings">Profile settings</Link>
              <Link href="/faq">FAQ</Link>
            </div>

            <div>
              <strong>Policies</strong>
              <Link href="/billing">Billing and cancellation</Link>
              <Link href="/refunds">Refunds and fulfillment</Link>
              <Link href="/upgrades">Upgrade program</Link>
              <Link href="/loyalty-policy">XP and rewards policy</Link>
              <Link href="/community-guidelines">Community guidelines</Link>
            </div>

            <div>
              <strong>Legal and support</strong>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>

          <div className="shell footer-bottom">
            <p>© 2026 Strafe Crate. All rights reserved.</p>
            <p>
              Counter-Strike, CS2, Steam, and related marks are trademarks of
              Valve Corporation. Strafe Crate is independent and is not
              affiliated with or endorsed by Valve Corporation.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
