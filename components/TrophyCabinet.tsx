"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import TrophyEmblem from "@/components/TrophyEmblem";
import styles from "./TrophyCabinet.module.css";

type Trophy = {
  member_trophy_id: string;
  trophy_id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  awarded_at: string;
  featured_slot: number | null;
};

export default function TrophyCabinet() {
  const supabase = useMemo(() => getSupabase(), []);
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [selected, setSelected] = useState<Array<string | null>>([
    null,
    null,
    null,
  ]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadTrophies() {
    setLoading(true);

    const { data, error } = await (supabase as any).rpc(
      "get_my_trophy_cabinet",
    );

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    const unlocked = (data ?? []) as Trophy[];
    setTrophies(unlocked);

    const next: Array<string | null> = [null, null, null];

    unlocked.forEach((trophy) => {
      if (
        trophy.featured_slot &&
        trophy.featured_slot >= 1 &&
        trophy.featured_slot <= 3
      ) {
        next[trophy.featured_slot - 1] = trophy.trophy_id;
      }
    });

    setSelected(next);
    setLoading(false);
  }

  useEffect(() => {
    void loadTrophies();
  }, []);

  function selectForSlot(trophyId: string) {
    if (activeSlot === null) return;

    setSelected((current) => {
      const next = [...current];

      // Remove this trophy from any other slot first.
      next.forEach((value, index) => {
        if (value === trophyId) next[index] = null;
      });

      next[activeSlot] = trophyId;
      return next;
    });

    setActiveSlot(null);
    setStatus("");
  }

  function clearSlot(slot: number) {
    setSelected((current) => {
      const next = [...current];
      next[slot] = null;
      return next;
    });

    setActiveSlot(null);
    setStatus("");
  }

  async function saveFeatured() {
    setStatus("Saving featured trophies...");

    const trophyIds = selected.filter(
      (value): value is string => Boolean(value),
    );

    const { error } = await (supabase as any).rpc(
      "set_my_featured_trophies",
      {
        selected_trophy_ids: trophyIds,
      },
    );

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Your public player card has been updated.");
    await loadTrophies();
  }

  function trophyForId(id: string | null) {
    if (!id) return null;
    return trophies.find((trophy) => trophy.trophy_id === id) ?? null;
  }

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>PROFILE FLEX</p>
          <h2>Trophy Cabinet</h2>
          <p>
            Click a slot to choose one of your unlocked achievements.
          </p>
        </div>

        <span className={styles.unlockedCount}>
          {trophies.length} unlocked
        </span>
      </div>

      <div className={styles.slotGrid}>
        {[0, 1, 2].map((slot) => {
          const trophy = trophyForId(selected[slot]);

          return (
            <button
              type="button"
              className={`${styles.slot} ${
                trophy ? styles[trophy.rarity] : styles.empty
              }`}
              key={slot}
              onClick={() => setActiveSlot(slot)}
            >
              <span className={styles.emblemFrame}>
                {trophy ? (
                  <TrophyEmblem
                    trophy={trophy.slug}
                    className={styles.emblem}
                  />
                ) : (
                  <span className={styles.emptyMark}>+</span>
                )}
              </span>

              <small>FEATURED SLOT {slot + 1}</small>
              <strong>{trophy?.name ?? "Choose trophy"}</strong>
              <p>
                {trophy?.description ??
                  "Click to select an unlocked achievement."}
              </p>

              <span className={styles.changeLabel}>
                {trophy ? "Change" : "Select"}
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.footer}>
        <p>
          These three trophies appear on your public player card and
          community profile.
        </p>

        <button
          className={styles.saveButton}
          type="button"
          disabled={loading}
          onClick={() => void saveFeatured()}
        >
          Save featured trophies
        </button>
      </div>

      {status && <p className={styles.status}>{status}</p>}

      {activeSlot !== null && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => setActiveSlot(null)}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={`Choose trophy for slot ${activeSlot + 1}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeading}>
              <div>
                <p className={styles.eyebrow}>
                  FEATURED SLOT {activeSlot + 1}
                </p>
                <h3>Choose an achievement</h3>
                <p>
                  Only trophies unlocked by your account are shown.
                </p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setActiveSlot(null)}
                aria-label="Close trophy picker"
              >
                ×
              </button>
            </div>

            <div className={styles.pickerGrid}>
              {trophies.map((trophy) => {
                const alreadySelected = selected.includes(
                  trophy.trophy_id,
                );

                return (
                  <button
                    type="button"
                    key={trophy.trophy_id}
                    className={`${styles.pickerCard} ${
                      styles[trophy.rarity]
                    } ${
                      selected[activeSlot] === trophy.trophy_id
                        ? styles.current
                        : ""
                    }`}
                    onClick={() => selectForSlot(trophy.trophy_id)}
                  >
                    <span>
                      <TrophyEmblem
                        trophy={trophy.slug}
                        className={styles.pickerEmblem}
                      />
                    </span>

                    <div>
                      <strong>{trophy.name}</strong>
                      <p>{trophy.description}</p>
                    </div>

                    <em>
                      {selected[activeSlot] === trophy.trophy_id
                        ? "CURRENT"
                        : alreadySelected
                          ? "MOVE HERE"
                          : trophy.rarity.toUpperCase()}
                    </em>
                  </button>
                );
              })}

              {!trophies.length && (
                <div className={styles.noTrophies}>
                  <strong>No trophies unlocked yet.</strong>
                  <p>
                    Complete memberships, levels, events, and collection
                    milestones to earn achievements.
                  </p>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => clearSlot(activeSlot)}
              >
                Clear this slot
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
