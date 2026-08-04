"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import TrophyEmblem from "@/components/TrophyEmblem";
import styles from "./DashboardProfileAndTrophies.module.css";

type Profile = {
  full_name: string | null;
  display_name: string | null;
  steam_profile_url: string | null;
  steam_trade_url: string | null;
  fulfillment_ready: boolean;
};

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

export default function DashboardProfileAndTrophies() {
  const supabase = useMemo(() => getSupabase(), []);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    display_name: "",
    steam_profile_url: "",
    steam_trade_url: "",
    fulfillment_ready: false,
  });
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [profileStatus, setProfileStatus] = useState("");
  const [trophyStatus, setTrophyStatus] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setProfileStatus("Authentication required.");
      setLoading(false);
      return;
    }

    const [profileResult, trophyResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name,display_name,steam_profile_url,steam_trade_url,fulfillment_ready")
        .eq("id", user.id)
        .single(),
      (supabase as any).rpc("get_my_trophy_cabinet"),
    ]);

    if (profileResult.error) setProfileStatus(profileResult.error.message);
    else setProfile(profileResult.data as Profile);

    if (trophyResult.error) setTrophyStatus(trophyResult.error.message);
    else {
      const unlocked = (trophyResult.data ?? []) as Trophy[];
      setTrophies(unlocked);
      setSelected(
        unlocked
          .filter((trophy) => trophy.featured_slot)
          .sort((a, b) => Number(a.featured_slot) - Number(b.featured_slot))
          .map((trophy) => trophy.trophy_id),
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function toggleTrophy(trophyId: string) {
    setTrophyStatus("");
    setSelected((current) => {
      if (current.includes(trophyId)) return current.filter((id) => id !== trophyId);
      if (current.length >= 3) {
        setTrophyStatus("You may feature up to three trophies.");
        return current;
      }
      return [...current, trophyId];
    });
  }

  async function saveProfile() {
    setProfileStatus("Saving profile...");
    const { data, error } = await (supabase as any).rpc("update_my_fulfillment_profile", {
      new_full_name: profile.full_name ?? "",
      new_display_name: profile.display_name ?? "",
      new_steam_profile_url: profile.steam_profile_url ?? "",
      new_steam_trade_url: profile.steam_trade_url ?? "",
    });

    if (error) {
      setProfileStatus(error.message);
      return;
    }

    const saved = Array.isArray(data) ? data[0] : data;
    if (saved) setProfile(saved as Profile);

    setProfileStatus(
      saved?.fulfillment_ready
        ? "Profile saved. Your account is ready for fulfillment."
        : "Profile saved, but both valid Steam URLs are required before fulfillment.",
    );
  }

  async function saveTrophies() {
    setTrophyStatus("Saving featured trophies...");
    const { error } = await (supabase as any).rpc("set_my_featured_trophies", {
      selected_trophy_ids: selected,
    });

    if (error) {
      setTrophyStatus(error.message);
      return;
    }

    setTrophyStatus("Featured trophies saved to your player card.");
    await load();
  }

  const featured = selected.map((id) => trophies.find((trophy) => trophy.trophy_id === id));

  return (
    <div className={styles.stack}>
      <section className={styles.panel}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>FULFILLMENT PROFILE</p>
            <h2>Profile and Steam settings</h2>
            <p>Your Steam profile and trade URL are required before an order can move into fulfillment.</p>
          </div>
          <span className={profile.fulfillment_ready ? styles.readyBadge : styles.requiredBadge}>
            {profile.fulfillment_ready ? "FULFILLMENT READY" : "ACTION REQUIRED"}
          </span>
        </div>

        <div className={styles.requirementNotice}>
          <strong>Required for every delivery</strong>
          <span>We use your Steam profile to confirm the account and your trade URL to send the official offer.</span>
        </div>

        <div className={styles.formGrid}>
          <label>
            Full name
            <input value={profile.full_name ?? ""} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} />
          </label>

          <label>
            Display name
            <input value={profile.display_name ?? ""} onChange={(event) => setProfile({ ...profile, display_name: event.target.value })} />
          </label>

          <label>
            Steam profile URL <b>Required</b>
            <input
              value={profile.steam_profile_url ?? ""}
              placeholder="https://steamcommunity.com/id/yourname"
              onChange={(event) => setProfile({ ...profile, steam_profile_url: event.target.value })}
            />
          </label>

          <label>
            Steam trade URL <b>Required</b>
            <input
              value={profile.steam_trade_url ?? ""}
              placeholder="https://steamcommunity.com/tradeoffer/new/?partner=..."
              onChange={(event) => setProfile({ ...profile, steam_trade_url: event.target.value })}
            />
          </label>
        </div>

        <p className={styles.securityNote}>
          Never enter your Steam password, Steam Guard code, session cookie, or API key.
        </p>

        <button className={styles.primaryButton} type="button" onClick={() => void saveProfile()}>
          Save fulfillment profile
        </button>

        {profileStatus && <p className={styles.status}>{profileStatus}</p>}
      </section>

      <section className={styles.panel}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>PROFILE FLEX</p>
            <h2>Trophy cabinet</h2>
            <p>Select up to three unlocked trophies. Selection order controls slots 1–3.</p>
          </div>
          <span className={styles.unlockedCount}>{trophies.length} unlocked</span>
        </div>

        <div className={styles.featuredPreview}>
          {[0, 1, 2].map((slot) => {
            const trophy = featured[slot];
            return (
              <article
                className={
                  trophy
                    ? `${styles.previewSlot} ${styles[trophy.rarity]}`
                    : `${styles.previewSlot} ${styles.empty}`
                }
                key={slot}
              >
                <span>
                  {trophy ? (
                    <TrophyEmblem trophy={trophy.slug} className={styles.trophyEmblem} />
                  ) : (
                    <span className={styles.emptyMark}>○</span>
                  )}
                </span>
                <small>FEATURED SLOT {slot + 1}</small>
                <strong>{trophy?.name ?? "Empty slot"}</strong>
                <p>{trophy?.description ?? "Select an unlocked trophy below."}</p>
              </article>
            );
          })}
        </div>

        <div className={styles.trophyPicker}>
          {trophies.map((trophy) => {
            const selectedIndex = selected.indexOf(trophy.trophy_id);
            const isSelected = selectedIndex >= 0;

            return (
              <button
                type="button"
                key={trophy.trophy_id}
                className={`${styles.trophyOption} ${styles[trophy.rarity]} ${isSelected ? styles.selected : ""}`}
                onClick={() => toggleTrophy(trophy.trophy_id)}
              >
                <span>
                  <TrophyEmblem trophy={trophy.slug} className={styles.trophyEmblem} />
                </span>
                <div>
                  <strong>{trophy.name}</strong>
                  <p>{trophy.description}</p>
                </div>
                <em>{isSelected ? `SLOT ${selectedIndex + 1}` : trophy.rarity.toUpperCase()}</em>
              </button>
            );
          })}

          {!loading && !trophies.length && (
            <div className={styles.noTrophies}>No trophies unlocked yet.</div>
          )}
        </div>

        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() => void saveTrophies()}
          disabled={loading}
        >
          Save featured trophies
        </button>

        {trophyStatus && <p className={styles.status}>{trophyStatus}</p>}
      </section>
    </div>
  );
}
