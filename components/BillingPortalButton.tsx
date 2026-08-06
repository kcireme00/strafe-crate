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
      setStatus(result.error || "Unable to open billing management.");
      return;
    }

    window.location.href = result.url;
  }

  return (
    <div className="billing-portal-control">
      <button type="button" className="button secondary billing-portal-button" onClick={() => void openPortal()} disabled={loading}>
        {loading ? "Opening billing..." : "Manage or cancel membership"}
      </button>
      {status && <small>{status}</small>}
    </div>
  );
}
