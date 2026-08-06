"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getRememberMePreference,
  getSupabase,
  setRememberMePreference,
} from "@/lib/supabase";

type Mode = "login" | "signup" | "forgot" | "reset";
export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(() =>
    getRememberMePreference(),
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setMessage("");
    if (mode === "login") {
      setRememberMePreference(rememberMe);
    }

    const supabase = getSupabase();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign("/dashboard");
        return;
      }
      if (mode === "signup") {
        if (!acceptedTerms) throw new Error("You must agree to the Terms of Service and Privacy Policy.");
        const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${base}/auth/callback` } });
        if (error) throw error;
        setMessage("Account created. Open the confirmation email before logging in.");
      }
      if (mode === "forgot") {
        const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${base}/reset-password` });
        if (error) throw error;
        setMessage("Password reset email sent.");
      }
      if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Password updated. Redirecting to your dashboard...");
        setTimeout(() => router.push("/dashboard"), 900);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setLoading(false); }
  }

  return <form className="auth-form" onSubmit={submit}>
    {mode === "signup" && <label>Full name<input value={fullName} onChange={e => setFullName(e.target.value)} required /></label>}
    {mode !== "reset" && <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>}
    {mode !== "forgot" && <label>{mode === "reset" ? "New password" : "Password"}<input type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required /></label>}
    {mode === "signup" && <label className="terms-check"><input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} required/><span>By creating an account, I agree to the <a href="/terms" target="_blank">Terms of Service</a>, <a href="/privacy" target="_blank">Privacy Policy</a>, <a href="/membership-policy" target="_blank">Membership and Value Policy</a>, and recurring billing terms.</span></label>}
    {mode === "login" && (
      <label className="remember-me-check">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={e => setRememberMe(e.target.checked)}
        />
        <span>Remember me on this device</span>
      </label>
    )}
    <button className="button primary full" disabled={loading}>{loading ? "Working..." : mode === "login" ? "Log in" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset email" : "Update password"}</button>
    {message && <p className="form-message">{message}</p>}
  </form>;
}
