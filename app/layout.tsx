import type { Metadata } from "next";
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

        <footer className="footer shell">
          <Brand />
          <p className="fine-print">
            Counter Strike, CS2, Steam, and related marks are trademarks or
            registered trademarks of Valve Corporation. Strafe Crate is
            independent and is not affiliated with or endorsed by Valve
            Corporation.
          </p>
        </footer>
      </body>
    </html>
  );
}
