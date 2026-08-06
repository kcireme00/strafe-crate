import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripeServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paymentLinks: Record<string, string> = {
  Recruit: "https://buy.stripe.com/6oUaEY5YQc292HO6iBebu05",
  Operative: "https://buy.stripe.com/eVq00kevmc29dms9uNebu04",
  Vanguard: "https://buy.stripe.com/7sY14o0Ew7LTaag8qJebu03",
  Elite: "https://buy.stripe.com/9B614o3QI5DLeqw5exebu02",
  Master: "https://buy.stripe.com/5kQaEYgDu7LTbekfTbebu01",
  Prestige: "https://buy.stripe.com/3cI7sM0Ewfel1DK0Yhebu00",
};

const tierAmounts: Record<string, number> = {
  Recruit: 2500,
  Operative: 5000,
  Vanguard: 7500,
  Elite: 10000,
  Master: 15000,
  Prestige: 20000,
};

async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!token) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

async function resolvePriceForTier(stripe: Stripe, tierName: string) {
  const linkUrl = paymentLinks[tierName];
  const expectedAmount = tierAmounts[tierName];

  // First use the exact Payment Link the business already configured.
  const links = await stripe.paymentLinks.list({ active: true, limit: 100 });
  const matchingLink = links.data.find((link) => link.url === linkUrl);

  if (matchingLink) {
    const lineItems = await stripe.paymentLinks.listLineItems(matchingLink.id, {
      limit: 10,
      expand: ["data.price.product"],
    });
    const recurringItem = lineItems.data.find(
      (item) => item.price?.recurring && item.price.active,
    );
    if (recurringItem?.price) return recurringItem.price;
  }

  // Safe fallback: find the recurring Stripe price matching the tier amount.
  const prices = await stripe.prices.list({
    active: true,
    type: "recurring",
    currency: "usd",
    limit: 100,
    expand: ["data.product"],
  });

  const matchingPrice = prices.data.find((price) => {
    if (price.unit_amount !== expectedAmount || !price.recurring) return false;
    const product = price.product;
    const productName =
      typeof product === "string" || product.deleted
        ? ""
        : product.name;
    return productName.toLowerCase().includes(tierName.toLowerCase());
  });

  if (!matchingPrice) {
    throw new Error(`Unable to find the active Stripe price for ${tierName}.`);
  }

  return matchingPrice;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = (await request.json()) as { tier?: string };
    const tierName = body.tier?.trim() ?? "";
    if (!paymentLinks[tierName]) {
      return NextResponse.json({ error: "Invalid membership tier." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id,email,display_name,full_name,steam_trade_url,fulfillment_ready,stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return NextResponse.json({ error: "Member profile not found." }, { status: 404 });
    }

    if (!profile.fulfillment_ready || !profile.steam_trade_url) {
      return NextResponse.json(
        { error: "Save your Steam trade URL before starting checkout.", code: "PROFILE_REQUIRED" },
        { status: 409 },
      );
    }

    const stripe = getStripe();
    const price = await resolvePriceForTier(stripe, tierName);
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://strafecrate.com").replace(/\/$/, "");

    let customerId = profile.stripe_customer_id as string | null;
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if ((customer as Stripe.DeletedCustomer).deleted) customerId = null;
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? profile.email ?? undefined,
        name: profile.display_name || profile.full_name || undefined,
        metadata: {
          supabase_user_id: user.id,
          strafe_crate_member: "true",
        },
      });
      customerId = customer.id;

      const { error: customerSaveError } = await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
      if (customerSaveError) throw customerSaveError;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${siteUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#plans?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: {
        supabase_user_id: user.id,
        membership_tier: tierName,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          membership_tier: tierName,
        },
      },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start checkout.";
    console.error("Create Stripe Checkout Session error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
