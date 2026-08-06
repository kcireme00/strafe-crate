"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function BillingPortalButton() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    setStatus("");

    const { data: { session } } = await getSupabase().auth.getSession();
    if (!session) {
      setLoading(false);
      setStatus("Please sign in again.");
      return;
    }

    const response = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok || !result.url) {
      console.error("Billing portal failed:", result.error);
      setStatus("Billing portal unavailable. Please try again.");
      return;
    }

    window.location.href = result.url;
  }

  return (
    <div className="billing-portal-control">
      <button type="button" className="button secondary billing-portal-button" onClick={() => void openPortal()} disabled={loading}>
        {loading
          ? "Opening billing..."
          : status
            ? "Retry billing portal"
            : "Manage or cancel membership"}
      </button>
      {status && <small className="billing-portal-status">{status}</small>}
    </div>
  );
}
