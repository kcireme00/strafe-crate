"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import TierEmblem from "@/components/TierEmblem";
import LoyaltyPanel from "@/components/LoyaltyPanel";
import TrophyCabinet from "@/components/TrophyCabinet";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

type Profile = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  role: string;
  steam_profile_url: string | null;
  steam_trade_url: string | null;
  account_approved: boolean;
  created_at: string;
};

type TierTheme = {
  color: string;
  soft: string;
  letter: string;
};

const tierThemes: Record<string, TierTheme> = {
  Recruit: { color: "#87919d", soft: "rgba(135,145,157,.14)", letter: "R" },
  Operative: { color: "#3f8cff", soft: "rgba(63,140,255,.14)", letter: "O" },
  Vanguard: { color: "#41c979", soft: "rgba(65,201,121,.14)", letter: "V" },
  Elite: { color: "#9a52ee", soft: "rgba(154,82,238,.14)", letter: "E" },
  Master: { color: "#e0ad3c", soft: "rgba(224,173,60,.14)", letter: "M" },
  Prestige: { color: "#e44258", soft: "rgba(228,66,88,.14)", letter: "P" },
};

function formatMonth(value?: string | null) {
  if (!value) return "New member";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "New member";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MemberDashboard({ user }: { user: User }) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabase(), []);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [weapons, setWeapons] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [trophies, setTrophies] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, s, o, w, h, l, t] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,display_name,email,role,steam_profile_url,steam_trade_url,account_approved,created_at")
          .eq("id", user.id)
          .single(),
        supabase
          .from("subscriptions")
          .select("status,current_period_end,cancel_at_period_end,membership_tiers(name,monthly_price_cents,upgrade_eligible)")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("fulfillment_orders")
          .select("id,billing_cycle,delivery_due_date,status,skin_name,exterior,weapon_categories(name)")
          .eq("user_id", user.id)
          .order("billing_cycle", { ascending: false }),
        supabase
          .from("weapon_categories")
          .select("id,name,category")
          .eq("active", true)
          .order("category")
          .order("name"),
        supabase
          .from("member_weapon_history")
          .select("weapon_categories(name),rotation_number,received_at")
          .eq("user_id", user.id),
        supabase
          .from("loyalty_accounts")
          .select("lifetime_xp,supply_credits,consecutive_paid_months,xp_multiplier")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("member_trophies")
          .select("id,featured_slot,awarded_at,trophy_definitions(name,description,icon,rarity)")
          .eq("user_id", user.id)
          .order("featured_slot", { ascending: true, nullsFirst: false }),
      ]);

      if (p.error) setMessage(p.error.message);
      else setProfile(p.data as Profile);

      setSubscription(s.data);
      setOrders(o.data || []);
      setWeapons(w.data || []);
      setHistory(h.data || []);
      setLoyalty(l.data || null);
      setTrophies(t.data || []);
      setLoading(false);
    })();
  }, [supabase, user.id]);

  function updateCardTilt(clientX: number, clientY: number, strength = 1) {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const normalizedX = x / rect.width - 0.5;
    const normalizedY = y / rect.height - 0.5;

    card.style.setProperty("--card-rotate-y", `${normalizedX * 11 * strength}deg`);
    card.style.setProperty("--card-rotate-x", `${normalizedY * -9 * strength}deg`);
    card.style.setProperty("--card-shift-x", `${normalizedX * 7 * strength}px`);
    card.style.setProperty("--card-shift-y", `${normalizedY * 5 * strength}px`);
    card.style.setProperty("--shine-x", `${x}px`);
    card.style.setProperty("--shine-y", `${y}px`);
  }

  function resetCardTilt() {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--card-rotate-y", "0deg");
    card.style.setProperty("--card-rotate-x", "0deg");
    card.style.setProperty("--card-shift-x", "0px");
    card.style.setProperty("--card-shift-y", "0px");
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setMessage("Saving...");

    const payload = {
      full_name: profile.full_name,
      display_name: profile.display_name,
      steam_profile_url: profile.steam_profile_url || null,
      steam_trade_url: profile.steam_trade_url || null,
    };

    const { error } = await (supabase.from("profiles") as any)
      .update(payload)
      .eq("id", user.id);

    setMessage(error ? error.message : "Profile saved.");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) return <main className="loading shell">Loading member data...</main>;
  if (!profile) {
    return (
      <main className="loading shell">
        <h1>Profile unavailable.</h1>
        <p>{message}</p>
      </main>
    );
  }

  const received = new Set(
    history.map((item: any) => item.weapon_categories?.name).filter(Boolean),
  );
  const tier: any = subscription?.membership_tiers;
  const current = orders[0];
  const tierName = tier?.name || "Membership Pending";
  const theme = tierThemes[tier?.name] || {
    color: "#ff7a2f",
    soft: "rgba(255,122,47,.13)",
    letter: "SC",
  };
  const memberName = profile.display_name || profile.full_name || "Strafe Crate Member";
  const tierPrice = tier ? `$${tier.monthly_price_cents / 100}` : "—";
  const minimumByTier: Record<string, number> = { Recruit: 21, Operative: 43, Vanguard: 66, Elite: 90, Master: 138, Prestige: 188 };
  const referenceMinimum = tier?.name ? minimumByTier[tier.name] : null;

  const cardStyle = {
    "--tier-color": theme.color,
    "--tier-soft": theme.soft,
  } as React.CSSProperties;

  return (
    <main className="app-shell shell">
      <div className="dashboard-top">
        <div>
          <p className="eyebrow">MEMBER DASHBOARD</p>
          <h1>Welcome, {memberName}.</h1>
        </div>
        <div className="top-actions">
          {profile.role === "admin" && (
            <a className="button secondary" href="/admin">Admin dashboard</a>
          )}
          <button className="text-button" onClick={logout}>Log out</button>
        </div>
      </div>

      <section className="member-identity-layout">
        <div className="member-card-stage">
          <div
            ref={cardRef}
            className="member-tier-card"
            style={cardStyle}
            onPointerMove={(event) => updateCardTilt(event.clientX, event.clientY, draggingRef.current ? 1.15 : 0.72)}
            onPointerDown={(event) => {
              draggingRef.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              event.currentTarget.classList.add("is-dragging");
              updateCardTilt(event.clientX, event.clientY, 1.15);
            }}
            onPointerUp={(event) => {
              draggingRef.current = false;
              event.currentTarget.releasePointerCapture(event.pointerId);
              event.currentTarget.classList.remove("is-dragging");
              resetCardTilt();
            }}
            onPointerCancel={(event) => {
              draggingRef.current = false;
              event.currentTarget.classList.remove("is-dragging");
              resetCardTilt();
            }}
            onPointerLeave={() => {
              if (!draggingRef.current) resetCardTilt();
            }}
          >
            <div className="member-card-shine" aria-hidden="true" />
            <div className="member-card-edge" aria-hidden="true" />

            <div className="member-card-header">
              <div className="member-card-brand">
                <span className="member-brand-mark"><Image src="/strafe-crate-mark.png" width={46} height={46} alt="Strafe Crate logo" /></span>
                <div>
                  <small>STRAFE CRATE</small>
                  <strong>{tierName.toUpperCase()}</strong>
                </div>
              </div>
              <div className="member-card-rank-area">
                {tier?.name && <TierEmblem tier={tier.name} className="member-card-rank" />}
                <span className={profile.account_approved ? "card-status approved" : "card-status"}>
                  {profile.account_approved ? "APPROVED" : "REVIEW PENDING"}
                </span>
              </div>
            </div>

            <div className="member-card-main">
              <small>MEMBER</small>
              <h2>{memberName}</h2>
              <p>{tier ? `${tierPrice} monthly membership · $${referenceMinimum}+ reference-value floor` : "Choose a membership to activate your collection."}</p>
            </div>

            <div className="member-card-footer">
              <div><small>REFERENCE VALUE</small><strong>{referenceMinimum ? `$${referenceMinimum}+` : "PENDING"}</strong></div>
              <div><small>UPGRADES</small><strong>{tier?.upgrade_eligible ? "ELIGIBLE" : "STANDARD"}</strong></div>
              <div><small>MEMBER SINCE</small><strong>{formatMonth(profile.created_at)}</strong></div>
            </div>
          </div>
          <p className="member-card-hint">Move or gently drag the card to view the finish.</p>
        </div>

        <div className="member-side-metrics">
          <article>
            <small>SUBSCRIPTION</small>
            <strong>{subscription?.status || "Pending"}</strong>
            <span>{subscription?.current_period_end ? `Renews ${formatDate(subscription.current_period_end)}` : "Manage billing comes next"}</span>
          </article>
          <article>
            <small>CURRENT ORDER</small>
            <strong>{current?.status?.replaceAll("_", " ") || "No active order"}</strong>
            <span>{current ? `Due ${formatDate(current.delivery_due_date)}` : "Created after payment"}</span>
          </article>
          <article>
            <small>WEAPON COVERAGE</small>
            <strong>{received.size} of {weapons.length || 34}</strong>
            <div className="coverage-track" aria-label={`${received.size} of ${weapons.length || 34} weapon categories completed`}>
              <span style={{ width: `${Math.min(100, (received.size / (weapons.length || 34)) * 100)}%` }} />
            </div>
          </article>
          {tier?.upgrade_eligible && (
            <article className="trade-up-metric">
              <small>TRADE UP ACCESS</small>
              <strong>Eligible</strong>
              <span>Send a previously delivered item before the monthly cutoff.</span>
              <a
                className="button trade-up-button"
                href="https://steamcommunity.com/tradeoffer/new/?partner=249207205&token=N1oHNTyP"
                target="_blank"
                rel="noreferrer noopener"
              >
                Open official trade link
              </a>
            </article>
          )}
        </div>
      </section>


      <LoyaltyPanel loyalty={loyalty} />

      <TrophyCabinet trophies={trophies} />

      <section className="panel profile-panel">
        <div className="panel-head">
          <div>
            <h2>Profile and Steam settings</h2>
            <p>This information is private to you and the admin account.</p>
          </div>
          <span className={profile.account_approved ? "status good" : "status"}>
            {profile.account_approved ? "APPROVED" : "REVIEW PENDING"}
          </span>
        </div>

        <form className="profile-form" onSubmit={save}>
          <label>Full name<input value={profile.full_name || ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></label>
          <label>Display name<input value={profile.display_name || ""} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} /></label>
          <label>Steam profile URL<input type="url" value={profile.steam_profile_url || ""} onChange={(e) => setProfile({ ...profile, steam_profile_url: e.target.value })} /></label>
          <label>Steam trade URL<input type="url" value={profile.steam_trade_url || ""} onChange={(e) => setProfile({ ...profile, steam_trade_url: e.target.value })} /></label>
          <p className="security-note">Never enter your Steam password, Steam Guard code, session cookie, or API key.</p>
          <button className="button primary">Save profile</button>
          {message && <span className="save-message">{message}</span>}
        </form>
      </section>

      <section className="panel">
        <h2>Weapon rotation</h2>
        <p>Track progress by weapon class. Open a group to see each category.</p>
        <div className="weapon-groups">
          {["Pistols","SMGs","Rifles","Snipers","Heavy"].map((group) => {
            const groupWeapons = weapons.filter((weapon: any) => {
              const category = String(weapon.category || "").toLowerCase();
              if (group === "Pistols") return category.includes("pistol");
              if (group === "SMGs") return category.includes("smg");
              if (group === "Rifles") return category.includes("rifle");
              if (group === "Snipers") return category.includes("sniper");
              return !category.includes("pistol") && !category.includes("smg") && !category.includes("rifle") && !category.includes("sniper");
            });
            if (!groupWeapons.length) return null;
            const complete = groupWeapons.filter((weapon: any) => received.has(weapon.name)).length;
            const percent = Math.round((complete / groupWeapons.length) * 100);
            return <details className="weapon-group" key={group}>
              <summary><span><strong>{group}</strong><small>{complete} of {groupWeapons.length} complete</small></span><b>{percent}%</b></summary>
              <div className="group-progress"><span style={{width:`${percent}%`}} /></div>
              <div className="weapon-grid">{groupWeapons.map((weapon:any)=><span className={received.has(weapon.name)?"received":""} key={weapon.id}>{received.has(weapon.name)?"✓":"○"} {weapon.name}</span>)}</div>
            </details>;
          })}
        </div>
      </section>

      <section className="panel">
        <h2>Drop history</h2>
        {orders.length ? (
          <div className="data-table">
            <div className="data-row head"><span>Cycle</span><span>Weapon</span><span>Skin</span><span>Status</span></div>
            {orders.map((order: any) => (
              <div className="data-row" key={order.id}>
                <span>{order.billing_cycle}</span>
                <span>{order.weapon_categories?.name || "Not assigned"}</span>
                <span>{order.skin_name || "Pending"}</span>
                <span>{order.status.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No monthly orders yet. Stripe will create them after successful payments.</p>
        )}
      </section>
    </main>
  );
}
