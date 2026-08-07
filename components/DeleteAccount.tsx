"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import styles from "./DeleteAccount.module.css";

export default function DeleteAccount() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabase(), []);
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    if (confirmation !== "DELETE" || deleting) return;

    const accepted = window.confirm(
      "Delete your Strafe Crate account permanently? Any active Stripe membership will be canceled immediately. This cannot be undone.",
    );

    if (!accepted) return;

    setDeleting(true);
    setStatus("Deleting account and cancelling billing...");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Please sign in again before deleting your account.");
      }

      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmation }),
      });

      const rawResponse = await response.text();
      let result: { error?: string; message?: string } = {};

      try {
        result = rawResponse
          ? (JSON.parse(rawResponse) as {
              error?: string;
              message?: string;
            })
          : {};
      } catch {
        result = {
          error: rawResponse || "The deletion service returned an invalid response.",
        };
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            `Unable to delete the account (HTTP ${response.status}).`,
        );
      }

      await supabase.auth.signOut();
      window.localStorage.clear();
      window.sessionStorage.clear();

      router.replace("/?account=deleted");
      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to delete the account.",
      );
      setDeleting(false);
    }
  }

  return (
    <section className={styles.panel}>
      <div>
        <p className={styles.eyebrow}>DANGER ZONE</p>
        <h2>Delete account</h2>
        <p>
          This permanently removes your login and public profile. Any active
          membership is canceled immediately so you cannot be charged again.
          Payment and fulfillment records may be retained in anonymized form
          for accounting, disputes, and legal obligations.
        </p>
      </div>

      <label className={styles.confirmation}>
        Type <strong>DELETE</strong> to continue
        <input
          value={confirmation}
          autoComplete="off"
          placeholder="DELETE"
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </label>

      <button
        type="button"
        className={styles.deleteButton}
        disabled={confirmation !== "DELETE" || deleting}
        onClick={() => void deleteAccount()}
      >
        {deleting ? "Deleting account..." : "Permanently delete account"}
      </button>

      {status && <p className={styles.status}>{status}</p>}
    </section>
  );
}
