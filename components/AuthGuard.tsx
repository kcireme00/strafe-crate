"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function AuthGuard({ children, admin = false }: { children: (user: User) => React.ReactNode; admin?: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;
    async function load() {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user ?? null;
      if (!active) return;
      if (!sessionUser) {
        router.replace("/login");
        return;
      }
      if (admin) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", sessionUser.id).single();
        if (profile?.role !== "admin") {
          setDenied(true);
          setReady(true);
          return;
        }
      }
      setUser(sessionUser);
      setReady(true);
    }
    load();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [admin, router]);

  if (!ready) return <main className="loading shell">Loading secure account...</main>;
  if (denied) return <main className="loading shell"><h1>Admin access required.</h1><a className="button secondary" href="/dashboard">Return to dashboard</a></main>;
  if (!user) return null;
  return <>{children(user)}</>;
}
