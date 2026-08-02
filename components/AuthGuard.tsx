"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

type AuthGuardProps = {
  children: (user: User) => React.ReactNode;
  admin?: boolean;
};

type ProfileRole = {
  role: string;
};

export default function AuthGuard({
  children,
  admin = false,
}: AuthGuardProps) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    async function loadSession() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!active) return;

      if (sessionError || !session?.user) {
        router.replace("/login");
        return;
      }

      const sessionUser = session.user;

      if (admin) {
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", sessionUser.id)
          .single();

        if (!active) return;

        const profile = data as ProfileRole | null;

        if (profileError || profile?.role !== "admin") {
          setDenied(true);
          setReady(true);
          return;
        }
      }

      setUser(sessionUser);
      setReady(true);
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [admin, router]);

  if (!ready) {
    return (
      <main className="loading shell">
        Loading secure account...
      </main>
    );
  }

  if (denied) {
    return (
      <main className="loading shell">
        <h1>Admin access required.</h1>
        <a className="button secondary" href="/dashboard">
          Return to dashboard
        </a>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children(user)}</>;
}