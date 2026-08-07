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
  const [showFinalWarning, setShowFinalWarning] = useState(false);

  function requestDeletion() {
    if (confirmation !== "DELETE" || deleting) return;
    setStatus("");
    setShowFinalWarning(true);
  }

  async function deleteAccount() {
    if (confirmation !== "DELETE" || deleting) return;

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
          error:
            rawResponse ||
            "The deletion service returned an invalid response.",
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
      setShowFinalWarning(false);
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to delete the account.",
      );
      setDeleting(false);
    }
  }

  return (
    <>
      <section className={styles.panel}>
        <div>
          <p className={styles.eyebrow}>DANGER ZONE</p>
          <h2>Delete account</h2>
          <p>
            This permanently removes your login and public profile. Any active
            membership is canceled immediately so you cannot be charged again.
            This action cannot be undone. Certain transaction records may still
            be retained by Stripe for payment, dispute, and legal obligations.
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
          onClick={requestDeletion}
        >
          {deleting ? "Deleting account..." : "Permanently delete account"}
        </button>

        {status && <p className={styles.status}>{status}</p>}
      </section>

      {showFinalWarning && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => {
            if (!deleting) setShowFinalWarning(false);
          }}
        >
          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-warning-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.warningIcon} aria-hidden="true">
              !
            </div>

            <p className={styles.modalEyebrow}>FINAL CONFIRMATION</p>
            <h3 id="delete-account-warning-title">
              Are you absolutely sure?
            </h3>

            <p className={styles.irreversible}>
              This action is permanent and cannot be reversed.
            </p>

            <ul>
              <li>Your Strafe Crate login and profile will be deleted.</li>
              <li>Any active membership will be canceled.</li>
              <li>You will lose access to your dashboard and member features.</li>
              <li>Deleted account data cannot be restored later.</li>
            </ul>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                disabled={deleting}
                onClick={() => setShowFinalWarning(false)}
              >
                Keep my account
              </button>

              <button
                type="button"
                className={styles.confirmDeleteButton}
                disabled={deleting}
                onClick={() => void deleteAccount()}
              >
                {deleting ? "Deleting forever..." : "Yes, delete forever"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
