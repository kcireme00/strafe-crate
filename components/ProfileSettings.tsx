"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "./ProfileSettings.module.css";

type Profile = {
  full_name: string | null;
  display_name: string | null;
  steam_profile_url: string | null;
  steam_trade_url: string | null;
  fulfillment_ready: boolean;
};

export default function ProfileSettings() {
  const supabase = useMemo(() => getSupabase(), []);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    display_name: "",
    steam_profile_url: "",
    steam_trade_url: "",
    fulfillment_ready: false,
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "full_name,display_name,steam_profile_url,steam_trade_url,fulfillment_ready",
        )
        .eq("id", user.id)
        .single();

      if (error) setStatus(error.message);
      else setProfile(data as Profile);
    }

    void load();
  }, []);

  async function saveProfile() {
    setStatus("Saving profile...");

    const { data, error } = await (supabase as any).rpc(
      "update_my_fulfillment_profile",
      {
        new_full_name: profile.full_name ?? "",
        new_display_name: profile.display_name ?? "",
        new_steam_profile_url: profile.steam_profile_url ?? "",
        new_steam_trade_url: profile.steam_trade_url ?? "",
      },
    );

    if (error) {
      setStatus(error.message);
      return;
    }

    const saved = Array.isArray(data) ? data[0] : data;
    if (saved) setProfile(saved as Profile);

    setStatus(
      saved?.fulfillment_ready
        ? "Profile saved. Your account is fulfillment ready."
        : "Both valid Steam URLs are required before fulfillment.",
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>FULFILLMENT PROFILE</p>
          <h2>Profile and Steam settings</h2>
          <p>
            Keep account identity and delivery details in one dedicated
            section.
          </p>
        </div>

        <span
          className={
            profile.fulfillment_ready
              ? styles.readyBadge
              : styles.requiredBadge
          }
        >
          {profile.fulfillment_ready
            ? "FULFILLMENT READY"
            : "ACTION REQUIRED"}
        </span>
      </div>

      <div className={styles.notice}>
        <strong>Required before delivery</strong>
        <span>
          A valid Steam profile and trade URL are required before an order
          can move into purchasing or fulfillment.
        </span>
      </div>

      <div className={styles.formGrid}>
        <label>
          Full name
          <input
            value={profile.full_name ?? ""}
            onChange={(event) =>
              setProfile({
                ...profile,
                full_name: event.target.value,
              })
            }
          />
        </label>

        <label>
          Display name
          <input
            value={profile.display_name ?? ""}
            onChange={(event) =>
              setProfile({
                ...profile,
                display_name: event.target.value,
              })
            }
          />
        </label>

        <label>
          Steam profile URL <b>Required</b>
          <input
            value={profile.steam_profile_url ?? ""}
            placeholder="https://steamcommunity.com/id/yourname"
            onChange={(event) =>
              setProfile({
                ...profile,
                steam_profile_url: event.target.value,
              })
            }
          />
        </label>

        <label>
          Steam trade URL <b>Required</b>
          <input
            value={profile.steam_trade_url ?? ""}
            placeholder="https://steamcommunity.com/tradeoffer/new/?partner=..."
            onChange={(event) =>
              setProfile({
                ...profile,
                steam_trade_url: event.target.value,
              })
            }
          />
        </label>
      </div>

      <p className={styles.security}>
        Never enter your Steam password, Steam Guard code, session cookie,
        or API key.
      </p>

      <button
        type="button"
        className={styles.saveButton}
        onClick={() => void saveProfile()}
      >
        Save fulfillment profile
      </button>

      {status && <p className={styles.status}>{status}</p>}
    </section>
  );
}
