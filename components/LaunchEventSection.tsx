"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import TrophyEmblem from "@/components/TrophyEmblem";
import styles from "./LaunchEventSection.module.css";

type ClaimStatus = "pending" | "approved" | "fulfilled" | "rejected" | null;

export default function LaunchEventSection() {
  const supabase = useMemo(() => getSupabase() as any, []);
  const [signedIn, setSignedIn] = useState(false);
  const [tradeReady, setTradeReady] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setSignedIn(Boolean(session?.user));

    const { data: countData } = await supabase.rpc(
      "get_launch_event_participant_count",
    );
    setParticipantCount(Number(countData ?? 0));

    if (!session?.user) {
      setTradeReady(false);
      setClaimStatus(null);
      return;
    }

    const [{ data: profile }, { data: claim }] = await Promise.all([
      supabase
        .from("profiles")
        .select("steam_trade_url")
        .eq("id", session.user.id)
        .maybeSingle(),
      supabase
        .from("launch_event_claims")
        .select("status")
        .eq("user_id", session.user.id)
        .maybeSingle(),
    ]);

    setTradeReady(Boolean(profile?.steam_trade_url?.trim()));
    setClaimStatus((claim?.status as ClaimStatus) ?? null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitClaim() {
    if (!signedIn) {
      window.location.href = "/signup";
      return;
    }

    if (!tradeReady) {
      window.location.href = "/settings?event=launch";
      return;
    }

    if (!confirmed || busy) return;

    setBusy(true);
    setStatus("");

    const { error } = await supabase.rpc("submit_launch_event_claim");

    setBusy(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus(
      "Claim submitted! We will manually verify your Steam username. Verification and delivery may take up to 7 days.",
    );
    setClaimStatus("pending");
    await load();
  }

  const alreadyClaimed =
    claimStatus === "pending" ||
    claimStatus === "approved" ||
    claimStatus === "fulfilled";

  return (
    <section className={styles.section} id="launch-event">
      <div className={styles.beachGlow} aria-hidden="true" />
      <div className={styles.palmLeft} aria-hidden="true">🌴</div>
      <div className={styles.palmRight} aria-hidden="true">🌴</div>

      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>LIMITED-TIME LAUNCH EVENT</p>
          <h2>Put StrafeCrate.com in your Steam name.</h2>
          <p>
            Help us spread the word before launch and receive a free
            <strong> P250 | Sand Dune</strong> plus the exclusive
            <strong> Sand Dollar Trophy</strong>.
          </p>
        </div>

        <div className={styles.counter}>
          <strong>{participantCount.toLocaleString()}</strong>
          <span>event participants</span>
        </div>
      </div>

      <div className={styles.rewardGrid}>
        <article className={styles.skinReward}>
          <div className={styles.sun} aria-hidden="true" />
          <div className={styles.pistol} aria-hidden="true">
            <span className={styles.slide} />
            <span className={styles.grip} />
            <span className={styles.trigger} />
          </div>
          <div>
            <small>FREE CS2 SKIN</small>
            <strong>P250 | Sand Dune</strong>
            <span>Exterior selected by Strafe Crate</span>
          </div>
        </article>

        <article className={styles.trophyReward}>
          <TrophyEmblem
            trophy="launch-sand-dollar"
            className={styles.trophy}
            title="Sand Dollar Trophy"
          />
          <div>
            <small>EXCLUSIVE TROPHY</small>
            <strong>Sand Dollar</strong>
            <span>Only available during this launch event</span>
          </div>
        </article>
      </div>

      <div className={styles.steps}>
        <div><b>1</b><span>Add <strong>StrafeCrate.com</strong> anywhere in your Steam username.</span></div>
        <div><b>2</b><span>Save a valid Steam Trade URL in your account settings.</span></div>
        <div><b>3</b><span>Confirm below. We manually verify your Steam profile before fulfillment.</span></div>
      </div>

      <div className={styles.claimPanel}>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={confirmed}
            disabled={alreadyClaimed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>
            I confirm that my Steam username currently includes
            <strong> StrafeCrate.com</strong>.
          </span>
        </label>

        <button
          type="button"
          disabled={busy || (!confirmed && !alreadyClaimed)}
          onClick={() => void submitClaim()}
        >
          {claimStatus === "fulfilled"
            ? "Reward sent"
            : claimStatus === "approved"
              ? "Verified — preparing reward"
              : claimStatus === "pending"
                ? "Verification pending"
                : busy
                  ? "Submitting..."
                  : !signedIn
                    ? "Create account to claim"
                    : !tradeReady
                      ? "Save Trade URL to claim"
                      : "Claim launch rewards"}
        </button>
      </div>

      <div className={styles.footer}>
        <span>Event ends September 1, 2026</span>
        <span>Manual verification and delivery may take up to 7 days</span>
        <Link href="/settings">Manage Steam settings →</Link>
      </div>

      {status && <p className={styles.status}>{status}</p>}
    </section>
  );
}
