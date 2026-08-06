"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import { getSupabase } from "@/lib/supabase";

type HeaderProfile = {
  full_name: string | null;
  display_name: string | null;
  role: string;
};

export default function SiteHeader() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    async function loadHeader() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;

      if (!session?.user) {
        setSignedIn(false);
        setProfile(null);
        setReady(true);
        return;
      }

      setSignedIn(true);

      const { data } = await supabase
        .from("profiles")
        .select("full_name,display_name,role")
        .eq("id", session.user.id)
        .single();

      if (!active) return;
      setProfile((data as HeaderProfile | null) ?? null);
      setReady(true);
    }

    void loadHeader();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(() => void loadHeader());

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function logOut() {
    await getSupabase().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const memberName =
    profile?.display_name || profile?.full_name || "Member";

  return (
    <header className="site-header shell">
      <Brand />
      <nav aria-label="Main navigation">
        <Link href="/#plans">Memberships</Link>

        {!ready ? null : signedIn ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/rewards">Rewards</Link>
            <Link href="/trophies">Trophies</Link>
            <Link href="/community">Community</Link>
            <Link href="/settings">Settings</Link>
            {profile?.role === "admin" && <Link href="/upgrades">Upgrades</Link>}
            {profile?.role === "admin" && <Link href="/admin">Admin</Link>}
            <Link className="nav-member" href="/dashboard">{memberName}</Link>
            <button className="nav-logout" type="button" onClick={logOut}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link className="nav-cta" href="/signup">Create account</Link>
          </>
        )}
      </nav>
    </header>
  );
}
