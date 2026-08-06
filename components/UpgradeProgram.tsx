"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "./UpgradeProgram.module.css";

const UPGRADE_TRADE_URL = "https://steamcommunity.com/tradeoffer/new/?partner=221761479&token=xs-UaRgM";

type EligibleItem = {
  item_id: string;
  order_id: string;
  weapon_category: string | null;
  skin_name: string;
  exterior: string | null;
  fulfilled_at: string | null;
  floor_value: number | null;
};

type Eligibility = {
  eligible: boolean;
  tier_name: string | null;
  target_cycle: string;
  existing_request_id: string | null;
  existing_status: string | null;
};

const acknowledgements = [
  "I understand this is an upgrade request for my next membership cycle, not an immediate replacement.",
  "I understand the upgrade may require multiple Steam trades and may be completed after the 14th.",
  "I understand upgrade outcomes depend on available inventory and market conditions, and the final item may have a lower value than I expected.",
  "I understand sticker value is excluded. Strafe Crate uses the item’s floor value and I should only return skins previously delivered by Strafe Crate.",
  "I understand clicking Proceed records my intent, but the request is not active unless I actually send the selected item through the official trade link.",
];

export default function UpgradeProgram() {
  const supabase = useMemo(() => getSupabase(), []);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [items, setItems] = useState<EligibleItem[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [checks, setChecks] = useState<boolean[]>(acknowledgements.map(() => false));
  const [status, setStatus] = useState("Loading upgrade access...");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const [eligibilityResult, itemsResult] = await Promise.all([
      (supabase as any).rpc("get_my_upgrade_eligibility"),
      (supabase as any).rpc("get_my_upgrade_items"),
    ]);

    if (eligibilityResult.error) {
      setStatus(eligibilityResult.error.message);
      return;
    }

    const row = Array.isArray(eligibilityResult.data)
      ? eligibilityResult.data[0]
      : eligibilityResult.data;
    setEligibility(row as Eligibility);

    if (itemsResult.error) {
      setStatus(itemsResult.error.message);
      return;
    }

    const available = (itemsResult.data ?? []) as EligibleItem[];
    setItems(available);
    setSelectedItem((current) => current || available[0]?.item_id || "");
    setStatus("");
  }

  useEffect(() => { void load(); }, []);

  const allChecked = checks.every(Boolean);
  const canProceed = Boolean(
    eligibility?.eligible && selectedItem && allChecked && !submitting,
  );

  async function proceed() {
    if (!canProceed) return;
    setSubmitting(true);
    setStatus("Recording your next-cycle upgrade intent...");

    const { error } = await (supabase as any).rpc("submit_my_upgrade_request", {
      source_item_id: selectedItem,
      acknowledged_timing: checks[0] && checks[1],
      acknowledged_risk: checks[2],
      acknowledged_stickers: checks[3],
      acknowledged_trade_required: checks[4],
    });

    setSubmitting(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Upgrade intent recorded. Steam is opening so you can send the selected item.");
    window.open(UPGRADE_TRADE_URL, "_blank", "noopener,noreferrer");
    await load();
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p>ELITE+ MEMBER FEATURE</p>
        <h1>Upgrade your next drop.</h1>
        <span>
          Return a previously delivered Strafe Crate skin and its eligible floor value can be considered alongside your next month’s membership value.
        </span>
      </section>

      <section className={styles.explainer}>
        <article><small>STEP 1</small><strong>Select a prior drop</strong><p>Choose a skin Strafe Crate previously delivered to your account.</p></article>
        <article><small>STEP 2</small><strong>Send it to review</strong><p>Complete the acknowledgments, then send the item through the official trade link.</p></article>
        <article><small>STEP 3</small><strong>Next-cycle consideration</strong><p>The accepted floor value may be combined with your next membership value while the team sources an upgrade.</p></article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <p>UPGRADE REQUEST</p>
            <h2>{eligibility?.tier_name ?? "Membership required"}</h2>
          </div>
          <span className={eligibility?.eligible ? styles.eligible : styles.locked}>
            {eligibility?.eligible ? "ELIGIBLE" : "ELITE+ REQUIRED"}
          </span>
        </div>

        {!eligibility?.eligible ? (
          <div className={styles.lockMessage}>
            Upgrade access is available to active Elite, Master, and Prestige members.
          </div>
        ) : (
          <>
            {eligibility.existing_request_id && (
              <div className={styles.existingRequest}>
                A request is already recorded for {new Date(eligibility.target_cycle).toLocaleDateString("en-US", { month: "long", year: "numeric" })}. Current status: <strong>{eligibility.existing_status?.replaceAll("_", " ")}</strong>.
              </div>
            )}

            <label className={styles.itemPicker}>
              Skin being returned
              <select value={selectedItem} onChange={(event) => setSelectedItem(event.target.value)}>
                <option value="">Select a previously delivered skin</option>
                {items.map((item) => (
                  <option value={item.item_id} key={item.item_id}>
                    {[item.weapon_category, item.skin_name, item.exterior].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </select>
            </label>

            {!items.length && (
              <p className={styles.noItems}>No eligible fulfilled skins are currently available to select.</p>
            )}

            <div className={styles.warning}>
              <strong>Floor value only</strong>
              <p>
                Sticker value is never included in an upgrade valuation. Only return skins Strafe Crate previously sent you. Any other item is reviewed using its ordinary floor value, regardless of stickers, crafts, or personal purchase price.
              </p>
            </div>

            <div className={styles.checklist}>
              {acknowledgements.map((label, index) => (
                <label key={label}>
                  <input
                    type="checkbox"
                    checked={checks[index]}
                    onChange={(event) => setChecks((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <button className={styles.proceed} type="button" disabled={!canProceed} onClick={() => void proceed()}>
              {submitting ? "Recording request..." : "Proceed to official Steam trade"}
            </button>
          </>
        )}

        {status && <p className={styles.status}>{status}</p>}
      </section>

      <section className={styles.disclosure}>
        <h2>How timing and value work</h2>
        <p>
          Upgrade fulfillment can extend beyond the normal 14th-day target because the process may involve receiving, reviewing, and completing multiple trades. Recording an intent does not guarantee that a returned item was received, accepted, or applied. The fulfillment team decides whether to apply the upgrade after confirming the Steam trade and reviewing the item.
        </p>
      </section>
    </main>
  );
}
