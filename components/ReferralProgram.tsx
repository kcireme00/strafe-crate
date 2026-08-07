"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "./ReferralProgram.module.css";

type ReferralSummary = {
  code: string;
  total_signups: number;
  activated_members: number;
  credits_earned: number;
};

export default function ReferralProgram() {
  const supabase = useMemo(() => getSupabase() as any, []);
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase.rpc("get_my_referral_program");
    if (error) {
      setStatus(error.message);
      return;
    }

    const row = (data?.[0] ?? null) as ReferralSummary | null;
    setSummary(row);
    if (row?.code) setCode(row.code);
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveCode() {
    const clean = code.trim().toUpperCase();
    if (!clean || busy) return;

    setBusy(true);
    setStatus("");

    const { data, error } = await supabase.rpc("set_my_referral_code", {
      desired_code: clean,
    });

    setBusy(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setCode(String(data ?? clean));
    setStatus("Referral code saved.");
    await load();
  }

  const site =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://strafecrate.com";

  const referralUrl = code ? `${site}/?ref=${encodeURIComponent(code)}` : "";

  async function copyLink() {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl);
    setStatus("Referral link copied.");
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p>STRAFE CRATE REFERRALS</p>
        <h1>Bring the squad.</h1>
        <span>
          Earn <strong>5 Supply Credits</strong> every time someone uses your
          referral code and activates a membership.
        </span>
      </section>

      <section className={styles.panel}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>YOUR CODE</p>
            <h2>Make it yours.</h2>
            <span>
              Codes are unique and can use letters, numbers, underscores, or
              dashes.
            </span>
          </div>
          <div className={styles.creditBadge}>
            <strong>+5</strong>
            <span>credits / activation</span>
          </div>
        </div>

        <div className={styles.codeEditor}>
          <input
            value={code}
            maxLength={24}
            placeholder="YOURCODE"
            onChange={(event) =>
              setCode(
                event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9_-]/g, ""),
              )
            }
          />
          <button type="button" disabled={busy || code.length < 3} onClick={() => void saveCode()}>
            {busy ? "Saving..." : summary ? "Update code" : "Create code"}
          </button>
        </div>

        {code && (
          <div className={styles.linkRow}>
            <span>{referralUrl}</span>
            <button type="button" onClick={() => void copyLink()}>
              Copy link
            </button>
          </div>
        )}

        <div className={styles.metrics}>
          <article>
            <small>REFERRED ACCOUNTS</small>
            <strong>{Number(summary?.total_signups ?? 0).toLocaleString()}</strong>
          </article>
          <article>
            <small>ACTIVE MEMBERS</small>
            <strong>{Number(summary?.activated_members ?? 0).toLocaleString()}</strong>
          </article>
          <article>
            <small>CREDITS EARNED</small>
            <strong>{Number(summary?.credits_earned ?? 0).toLocaleString()}</strong>
          </article>
        </div>

        <div className={styles.rules}>
          <strong>How it works</strong>
          <span>1. Share your personalized referral link or code.</span>
          <span>2. They create their Strafe Crate account using that referral.</span>
          <span>3. Once their membership activates, you receive 5 Supply Credits automatically.</span>
          <span>Each referred account can reward credits only once.</span>
        </div>

        {status && <p className={styles.status}>{status}</p>}
      </section>
    </main>
  );
}
