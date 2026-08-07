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
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
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
        if (!acceptedTerms) {
          throw new Error(
            "You must agree to the Terms of Service and Privacy Policy.",
          );
        }

        const base =
          process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

        const referralCode =
          typeof window !== "undefined"
            ? window.localStorage.getItem("strafe_referral_code")
            : null;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              ...(referralCode
                ? { referral_code: referralCode.toUpperCase() }
                : {}),
            },
            emailRedirectTo: `${base}/auth/callback`,
          },
        });

        if (error) throw error;

        // With email confirmation enabled, Supabase returns a user but no
        // active session. Show a dedicated trust-building verification view.
        if (data.user && !data.session) {
          setVerificationEmail(email);
          return;
        }

        // This fallback covers projects where email confirmation is disabled.
        window.location.assign("/dashboard");
        return;
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


  async function resendVerification() {
    if (!verificationEmail || resending) return;

    setResending(true);
    setMessage("");

    try {
      const base =
        process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

      const { error } = await getSupabase().auth.resend({
        type: "signup",
        email: verificationEmail,
        options: {
          emailRedirectTo: `${base}/auth/callback`,
        },
      });

      if (error) throw error;
      setMessage("A new verification email was sent.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to resend the verification email.",
      );
    } finally {
      setResending(false);
    }
  }

  if (mode === "signup" && verificationEmail) {
    return (
      <section className="verify-email-card" aria-live="polite">
        <div className="verify-email-icon" aria-hidden="true">
          ✓
        </div>

        <p className="eyebrow">ONE MORE STEP</p>
        <h2>Verify your email</h2>

        <p className="verify-email-lead">
          We sent a secure verification link to:
        </p>

        <strong className="verify-email-address">
          {verificationEmail}
        </strong>

        <div className="verify-email-steps">
          <span><b>1</b> Open the email from Strafe Crate.</span>
          <span><b>2</b> Select <strong>Verify email</strong>.</span>
          <span><b>3</b> Return here and sign in.</span>
        </div>

        <a className="button primary full" href="/login">
          Continue to sign in
        </a>

        <button
          className="verify-email-resend"
          type="button"
          disabled={resending}
          onClick={() => void resendVerification()}
        >
          {resending ? "Sending…" : "Didn’t receive it? Resend email"}
        </button>

        <p className="verify-email-help">
          Check your spam or promotions folder. Support:{" "}
          <a href="mailto:strafecrate@gmail.com">
            strafecrate@gmail.com
          </a>
        </p>

        {message && <p className="form-message">{message}</p>}
      </section>
    );
  }

  return <form className="auth-form" onSubmit={submit}>
    {mode === "signup" && <label>Full name<input value={fullName} onChange={e => setFullName(e.target.value)} required /></label>}
    {mode !== "reset" && <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>}
    {mode !== "forgot" && <label>{mode === "reset" ? "New password" : "Password"}<input type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required /></label>}
    {mode === "signup" && <label className="terms-check"><input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} required/><span>By creating an account, I agree to the <a href="/terms" target="_blank">Terms of Service</a>, <a href="/privacy" target="_blank">Privacy Policy</a>, and <a href="/membership-policy" target="_blank">Membership and Value Policy</a>.</span></label>}
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
