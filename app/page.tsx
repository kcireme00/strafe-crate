"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import TierEmblem from "@/components/TierEmblem";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import TierMemberTracker from "@/components/TierMemberTracker";

const checkoutLinks: Record<string, string> = {
  Recruit: process.env.NEXT_PUBLIC_STRIPE_RECRUIT_URL || "https://buy.stripe.com/6oUaEY5YQc292HO6iBebu05",
  Operative: process.env.NEXT_PUBLIC_STRIPE_OPERATIVE_URL || "https://buy.stripe.com/eVq00kevmc29dms9uNebu04",
  Vanguard: process.env.NEXT_PUBLIC_STRIPE_VANGUARD_URL || "https://buy.stripe.com/7sY14o0Ew7LTaag8qJebu03",
  Elite: process.env.NEXT_PUBLIC_STRIPE_ELITE_URL || "https://buy.stripe.com/9B614o3QI5DLeqw5exebu02",
  Master: process.env.NEXT_PUBLIC_STRIPE_MASTER_URL || "https://buy.stripe.com/5kQaEYgDu7LTbekfTbebu01",
  Prestige: process.env.NEXT_PUBLIC_STRIPE_PRESTIGE_URL || "https://buy.stripe.com/3cI7sM0Ewfel1DK0Yhebu00",
};

const tiers = [
  { name: "Recruit", price: 25, minimum: 21, color: "slate", letter: "R", subtitle: "Start your collection." },
  { name: "Operative", price: 50, minimum: 43, color: "blue", letter: "O", subtitle: "Build consistent momentum." },
  { name: "Vanguard", price: 75, minimum: 66, color: "green", letter: "V", subtitle: "Expand into premium territory." },
  { name: "Elite", price: 100, minimum: 90, color: "purple", letter: "E", subtitle: "Where serious collections begin." },
  { name: "Master", price: 150, minimum: 138, color: "gold", letter: "M", subtitle: "Built for dedicated collectors." },
  { name: "Prestige", price: 200, minimum: 188, color: "crimson", letter: "P", subtitle: "The flagship membership." },
];

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  const [fulfillmentReady, setFulfillmentReady] = useState(false);
  const [checkoutUser, setCheckoutUser] = useState<{ id: string; email: string } | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      setSignedIn(Boolean(session?.user));
      setCheckoutUser(session?.user ? { id: session.user.id, email: session.user.email ?? "" } : null);

      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("fulfillment_ready")
          .eq("id", session.user.id)
          .maybeSingle();
        if (active) setFulfillmentReady(Boolean((data as { fulfillment_ready?: boolean } | null)?.fulfillment_ready));
      } else {
        setFulfillmentReady(false);
      }
    }

    void loadSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (active) void loadSession();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);


  function startCheckout(tierName: string) {
    if (!signedIn) {
      window.location.href = "/signup";
      return;
    }

    if (!fulfillmentReady) {
      setCheckoutNotice(tierName);
      return;
    }

    const checkoutUrl = checkoutLinks[tierName];
    if (!checkoutUrl) {
      setCheckoutNotice("missing-link");
      return;
    }

    const url = new URL(checkoutUrl);
    if (checkoutUser?.id) url.searchParams.set("client_reference_id", checkoutUser.id);
    if (checkoutUser?.email) url.searchParams.set("locked_prefilled_email", checkoutUser.email);
    window.location.href = url.toString();
  }

  function updateTilt(clientX: number, clientY: number, strength = 1) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const nx = x / rect.width - 0.5;
    const ny = y / rect.height - 0.5;
    card.style.setProperty("--showcase-rotate-y", `${nx * 10 * strength}deg`);
    card.style.setProperty("--showcase-rotate-x", `${ny * -8 * strength}deg`);
    card.style.setProperty("--showcase-shine-x", `${x}px`);
    card.style.setProperty("--showcase-shine-y", `${y}px`);
  }

  function resetTilt() {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--showcase-rotate-y", "0deg");
    card.style.setProperty("--showcase-rotate-x", "0deg");
  }

  return (
    <main>
      <section className="hero shell">
        <div>
          <p className="eyebrow">PREMIUM MONTHLY CS2 SKIN MEMBERSHIPS</p>
          <h1>Build your inventory, one cycle at a time.</h1>
          <p className="lead">Create an account, save your Steam trade URL, and track every monthly drop in a private dashboard.</p>
          <div className="actions">
            {signedIn ? (
              <>
                <Link className="button primary" href="/dashboard">Open dashboard</Link>
                <Link className="button secondary" href="#plans">View memberships</Link>
              </>
            ) : (
              <>
                <Link className="button primary" href="/signup">Create account</Link>
                <Link className="button secondary" href="/login">Member login</Link>
              </>
            )}
          </div>
          <div className="trust"><span>✓ Billing on the 1st</span><span>✓ Delivery by the 14th</span><span>✓ Nonduplicate weapon rotation</span></div>
        </div>

        <div className="showcase-card-stage">
          <div
            ref={cardRef}
            className="showcase-membership-card"
            onPointerMove={(event) => updateTilt(event.clientX, event.clientY, draggingRef.current ? 1.1 : .72)}
            onPointerDown={(event) => {
              draggingRef.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              event.currentTarget.classList.add("is-dragging");
              updateTilt(event.clientX, event.clientY, 1.1);
            }}
            onPointerUp={(event) => {
              draggingRef.current = false;
              event.currentTarget.releasePointerCapture(event.pointerId);
              event.currentTarget.classList.remove("is-dragging");
              resetTilt();
            }}
            onPointerCancel={(event) => {
              draggingRef.current = false;
              event.currentTarget.classList.remove("is-dragging");
              resetTilt();
            }}
            onPointerLeave={() => { if (!draggingRef.current) resetTilt(); }}
          >
            <div className="showcase-card-shine" aria-hidden="true" />
            <div className="showcase-card-top">
              <div className="showcase-brand">
                <Image src="/strafe-crate-mark.png" width={54} height={54} alt="Strafe Crate logo" />
                <span>STRAFE CRATE</span>
              </div>
              <b>MEMBERSHIP</b>
            </div>
            <div className="showcase-card-center">
              <small>PREMIUM MONTHLY COLLECTION</small>
              <strong>CURATED DROP</strong>
              <p>One clean card. Six membership levels.</p>
            </div>
            <div className="showcase-card-bottom">
              <div><small>COLLECTION</small><strong>SIX LEVELS</strong></div>
              <div><small>DELIVERY</small><strong>BY THE 14TH</strong></div>
              <div><small>UPGRADES</small><strong className="green">ELITE+</strong></div>
            </div>
          </div>
          <p className="showcase-card-hint">Move or gently drag the card to view the finish.</p>
        </div>
      </section>

      <section className="value-section shell"><div><p className="eyebrow">TRANSPARENT VALUE</p><h2>Published minimum values at every level.</h2><p>Each membership has a disclosed Steam Community Market reference-value floor. Higher tiers retain a larger share of the monthly price while supporting sourcing, fulfillment, rotation management, and customer service.</p><Link className="text-link" href="/membership-policy">Read how valuation and selection work →</Link></div><div className="value-grid"><article><strong>$21+</strong><span>Recruit minimum</span></article><article><strong>$90+</strong><span>Elite minimum</span></article><article><strong>$188+</strong><span>Prestige minimum</span></article></div></section>

      <section className="section band" id="plans">
        <div className="shell">
          <div className="center"><p className="eyebrow">MEMBERSHIPS</p><h2>Six collection levels.</h2><p>Higher tiers receive stronger published minimum-value retention.</p></div>
          <div className="pricing">
            {tiers.map((tier) => (
              <article className={`plan tier-${tier.color}`} key={tier.name}>
                <TierEmblem tier={tier.name} className="plan-tier-rank" />
                <p className="tier-name">{tier.name.toUpperCase()}</p>
                <p className="price">${tier.price}<small>/month</small></p>
                <p className="tier-subtitle">{tier.subtitle}</p>
                <ul><li>One curated CS2 skin per active cycle</li><li>Trade sent by the 14th</li><li>Private collection history</li><li>{tier.price >= 100 ? "Upgrade eligible" : "Standard fulfillment"}</li></ul>
                <button className="button tier-button" type="button" onClick={() => startCheckout(tier.name)}>
                  {signedIn ? `Choose ${tier.name} →` : `Create account →`}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <TierMemberTracker />

      <section className="trust-center shell"><article><strong>Transparent valuation</strong><p>A defined Steam reference-value floor for every tier.</p></article><article><strong>Secure billing</strong><p>Subscription payments are processed securely through Stripe.</p></article><article><strong>Collection rotation</strong><p>The system aims to avoid duplicate weapon categories until a rotation is complete.</p></article></section>

      {checkoutNotice && (
        <div className="checkout-guard-backdrop" onMouseDown={() => setCheckoutNotice(null)}>
          <section className="checkout-guard-card" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="checkout-guard-close" type="button" onClick={() => setCheckoutNotice(null)}>×</button>
            <p className="eyebrow">DELIVERY REQUIREMENT</p>
            <h2>{checkoutNotice === "missing-link" ? "Checkout is not configured." : "Complete your Steam delivery profile."}</h2>
            <p>
              {checkoutNotice === "missing-link"
                ? "This membership payment link has not been connected yet. Please contact support before attempting checkout."
                : `Before purchasing ${checkoutNotice}, save a valid Steam trade URL. This is required so your monthly item can be sent to the correct account.`}
            </p>
            <div className="checkout-guard-actions">
              {checkoutNotice !== "missing-link" && <Link className="button primary" href="/settings">Complete delivery profile</Link>}
              <button className="button secondary" type="button" onClick={() => setCheckoutNotice(null)}>Go back</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
