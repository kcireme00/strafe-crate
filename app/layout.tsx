import type { Metadata } from "next";
import Link from "next/link";
import Brand from "@/components/Brand";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://strafecrate.com",
  ),
  title: {
    default: "Strafe Crate",
    template: "%s | Strafe Crate",
  },
  description:
    "Premium monthly CS2 skin memberships with transparent fulfillment and collector progression.",
  applicationName: "Strafe Crate",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/strafe-crate-mark.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Strafe Crate",
    description:
      "Premium monthly CS2 skin memberships with transparent fulfillment and collector progression.",
    url: "https://strafecrate.com",
    siteName: "Strafe Crate",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "Strafe Crate logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Strafe Crate",
    description:
      "Premium monthly CS2 skin memberships with transparent fulfillment and collector progression.",
    images: ["/icon.png"],
  },
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
              <a href="mailto:strafecrate@gmail.com">strafecrate@gmail.com</a>
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
