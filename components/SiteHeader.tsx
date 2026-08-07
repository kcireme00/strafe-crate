"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import { getSupabase } from "@/lib/supabase";

type HeaderProfile = {
  full_name: string | null;
  display_name: string | null;
  role: string;
};

export default function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    function captureReferralFromUrl() {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const referral = params.get("ref")?.trim().toUpperCase();

      if (referral && /^[A-Z0-9_-]{3,24}$/.test(referral)) {
        window.localStorage.setItem("strafe_referral_code", referral);
      }
    }

    async function attachPendingReferral() {
      if (typeof window === "undefined") return;
      const referral =
        window.localStorage.getItem("strafe_referral_code")?.trim();

      if (!referral) return;

      const { error } = await (supabase as any).rpc(
        "claim_referral_code",
        { referral_code: referral },
      );

      if (!error) {
        window.localStorage.removeItem("strafe_referral_code");
      } else {
        console.warn("Referral attribution was not attached:", error.message);
      }
    }

    captureReferralFromUrl();

    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from("profiles")
        .select("full_name,display_name,role")
        .eq("id", userId)
        .maybeSingle();

      if (!active) return;
      setProfile((data as HeaderProfile | null) ?? null);
    }

    async function loadHeader() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      const sessionUser = session?.user ?? null;
      setSignedIn(Boolean(sessionUser));
      setReady(true);

      if (!sessionUser) {
        setProfile(null);
        return;
      }

      await loadProfile(sessionUser.id);
      await attachPendingReferral();
    }

    void loadHeader();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      const sessionUser = session?.user ?? null;
      setSignedIn(Boolean(sessionUser));
      setReady(true);

      if (!sessionUser) {
        setProfile(null);
        return;
      }

      // Run profile retrieval outside the auth callback stack.
      window.setTimeout(() => {
        void loadProfile(sessionUser.id);
        void attachPendingReferral();
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);


  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function logOut() {
    setMobileOpen(false);
    await getSupabase().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const memberName =
    profile?.display_name || profile?.full_name || "Member";

  const signedInLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/rewards", label: "Rewards" },
    { href: "/referrals", label: "Referral" },
    { href: "/community", label: "Community" },
    { href: "/support", label: "Support" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <>
      <header className="site-header shell">
        <Brand />

        <nav className="desktop-nav" aria-label="Main navigation">
          <Link href="/#plans">Memberships</Link>

          {!ready ? null : signedIn ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/rewards">Rewards</Link>
              <Link href="/referrals">Referral</Link>
              <Link href="/community">Community</Link>
              <Link href="/support">Support</Link>
              <Link href="/settings">Settings</Link>
              {profile?.role === "admin" && (
                <Link href="/upgrades">Upgrades</Link>
              )}
              {profile?.role === "admin" && <Link href="/admin">Admin</Link>}
              <Link className="nav-member" href="/dashboard">
                {memberName}
              </Link>
              <button className="nav-logout" type="button" onClick={logOut}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link className="nav-cta" href="/signup">
                Create account
              </Link>
            </>
          )}
        </nav>

        <button
          type="button"
          className="mobile-menu-button"
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <div
        className={`mobile-nav-overlay ${mobileOpen ? "open" : ""}`}
        role="presentation"
        onMouseDown={() => setMobileOpen(false)}
      >
        <aside
          className={`mobile-nav-drawer ${mobileOpen ? "open" : ""}`}
          aria-label="Mobile navigation"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="mobile-nav-top">
            <Brand />
            <button
              type="button"
              className="mobile-nav-close"
              aria-label="Close navigation menu"
              onClick={() => setMobileOpen(false)}
            >
              ×
            </button>
          </div>

          {!ready ? null : signedIn ? (
            <>
              <div className="mobile-member-card">
                <small>MEMBER</small>
                <strong>{memberName}</strong>
                <span>Strafe Crate account</span>
              </div>

              <nav className="mobile-nav-links">
                <Link href="/#plans">Memberships</Link>
                {signedInLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={
                      pathname === link.href ||
                      pathname.startsWith(`${link.href}/`)
                        ? "active"
                        : ""
                    }
                  >
                    {link.label}
                  </Link>
                ))}
                {profile?.role === "admin" && (
                  <Link
                    href="/upgrades"
                    className={pathname.startsWith("/upgrades") ? "active" : ""}
                  >
                    Upgrades
                  </Link>
                )}
                {profile?.role === "admin" && (
                  <Link
                    href="/admin"
                    className={pathname.startsWith("/admin") ? "active" : ""}
                  >
                    Admin
                  </Link>
                )}
              </nav>

              <button
                className="mobile-nav-logout"
                type="button"
                onClick={logOut}
              >
                Log out
              </button>
            </>
          ) : (
            <nav className="mobile-nav-links">
              <Link href="/#plans">Memberships</Link>
              <Link href="/login">Login</Link>
              <Link className="mobile-nav-primary" href="/signup">
                Create account
              </Link>
            </nav>
          )}
        </aside>
      </div>
    </>
  );
}