"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import styles from "@/app/admin/admin.module.css";

type Metric = {
  period_key: "current_month" | "fiscal_year" | "lifetime";
  revenue_cents: number;
  cost_cents: number;
  profit_cents: number;
  order_count: number;
};

const labels: Record<Metric["period_key"], string> = {
  current_month: "CURRENT MONTH",
  fiscal_year: "FISCAL YEAR",
  lifetime: "LIFETIME",
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(cents || 0) / 100);
}

export default function AdminBusinessMetrics() {
  const supabase = useMemo(() => getSupabase(), []);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [status, setStatus] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function load() {
    setRefreshing(true);
    setStatus("Refreshing recorded financials...");
    const { data, error } = await (supabase as any).rpc("get_admin_business_metrics");
    if (error) {
      setStatus(error.message);
    } else {
      setMetrics((data ?? []) as Metric[]);
      setLastUpdated(new Date());
      setStatus("");
    }
    setRefreshing(false);
  }

  useEffect(() => {
    void load();

    const refreshAfterSave = () => void load();
    window.addEventListener("strafe:order-saved", refreshAfterSave);

    return () => {
      window.removeEventListener("strafe:order-saved", refreshAfterSave);
    };
  }, []);

  return (
    <section className={styles.metricsPanel}>
      <div className={styles.metricsHeading}>
        <div>
          <p className={styles.eyebrow}>BUSINESS PERFORMANCE</p>
          <h2>Revenue & Profit</h2>
          <p>Recorded paid-cycle revenue minus recorded skin acquisition cost. Test orders are excluded.</p>
        </div>
        <div className={styles.metricsRefreshArea}>
          {lastUpdated && (
            <small>Updated {lastUpdated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</small>
          )}
          <button type="button" disabled={refreshing} onClick={() => void load()}>
            {refreshing ? "Refreshing..." : "Refresh metrics"}
          </button>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        {(["current_month", "fiscal_year", "lifetime"] as const).map((key) => {
          const metric = metrics.find((item) => item.period_key === key);
          return (
            <article key={key}>
              <small>{labels[key]}</small>
              <strong>{money(metric?.revenue_cents ?? 0)}</strong>
              <div><span>Profit</span><b>{money(metric?.profit_cents ?? 0)}</b></div>
              <div><span>Acquisition cost</span><b>{money(metric?.cost_cents ?? 0)}</b></div>
              <p>{metric?.order_count ?? 0} recorded paid cycles</p>
            </article>
          );
        })}
      </div>
      {status && <p className={styles.pageStatus}>{status}</p>}
    </section>
  );
}
