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

class CheckoutError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 500,
  ) {
    super(message);
  }
}

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
  const expectedLink = paymentLinks[tierName];
  const expectedAmount = tierAmounts[tierName];

  // Reuse the recurring Price behind the live Payment Link you already built.
  const links = await stripe.paymentLinks.list({ active: true, limit: 100 });
  const matchingLink = links.data.find((link) => link.url === expectedLink);

  if (matchingLink) {
    const lineItems = await stripe.paymentLinks.listLineItems(matchingLink.id, {
      limit: 10,
      expand: ["data.price.product"],
    });

    const recurringItem = lineItems.data.find(
      (item) =>
        item.price?.active &&
        item.price.recurring &&
        item.price.unit_amount === expectedAmount,
    );

    if (recurringItem?.price) return recurringItem.price;
  }

  // Fallback if a Payment Link was renamed or recreated.
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
    if (typeof product === "string" || product.deleted) return true;

    return product.name.toLowerCase().includes(tierName.toLowerCase());
  });

  if (!matchingPrice) {
    throw new CheckoutError(
      `Stripe could not find the active $${expectedAmount / 100}/month ${tierName} price. Confirm the Payment Link is active in the same live Stripe account as STRIPE_SECRET_KEY.`,
      "PRICE_NOT_FOUND",
      500,
    );
  }

  return matchingPrice;
}

async function findOrCreateCustomer(
  stripe: Stripe,
  user: { id: string; email?: string | null },
  profile: { email?: string | null; display_name?: string | null; full_name?: string | null },
) {
  // This does not rely on a stripe_customer_id column being present in Supabase.
  try {
    const result = await stripe.customers.search({
      query: `metadata['supabase_user_id']:'${user.id}'`,
      limit: 1,
    });
    const existing = result.data[0];
    if (existing && !existing.deleted) return existing.id;
  } catch (error) {
    // Customer Search can be temporarily unavailable immediately after account changes.
    console.warn("Stripe customer metadata search skipped:", error);
  }

  const email = user.email ?? profile.email ?? undefined;
  if (email) {
    const customers = await stripe.customers.list({ email, limit: 10 });
    const existing = customers.data.find(
      (customer) => customer.metadata.supabase_user_id === user.id,
    );
    if (existing) return existing.id;
  }

  const customer = await stripe.customers.create({
    email,
    name: profile.display_name || profile.full_name || undefined,
    metadata: {
      supabase_user_id: user.id,
      strafe_crate_member: "true",
    },
  });

  return customer.id;
}

function linkedPaymentLinkUrl(
  tierName: string,
  userId: string,
  email?: string | null,
) {
  const url = new URL(paymentLinks[tierName]);
  url.searchParams.set("client_reference_id", userId);
  if (email) url.searchParams.set("locked_prefilled_email", email);
  return url.toString();
}

export async function POST(request: NextRequest) {
  let stage = "authenticate";

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new CheckoutError("Please sign in again before checkout.", "AUTH_REQUIRED", 401);
    }

    stage = "validate tier";
    const body = (await request.json()) as { tier?: string };
    const tierName = body.tier?.trim() ?? "";
    if (!paymentLinks[tierName]) {
      throw new CheckoutError("Invalid membership tier.", "INVALID_TIER", 400);
    }

    stage = "load member profile";
    const admin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id,email,display_name,full_name,steam_trade_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new CheckoutError(
        `Unable to load your member profile: ${profileError.message}`,
        "PROFILE_LOOKUP_FAILED",
      );
    }
    if (!profile) {
      throw new CheckoutError("Member profile not found.", "PROFILE_NOT_FOUND", 404);
    }

    if (!profile.steam_trade_url) {
      throw new CheckoutError(
        "Save your Steam trade URL before starting checkout.",
        "PROFILE_REQUIRED",
        409,
      );
    }

    const accountEmail = user.email ?? profile.email ?? null;
    const fallbackUrl = linkedPaymentLinkUrl(
      tierName,
      user.id,
      accountEmail,
    );

    try {
      stage = "connect to Stripe";
      const stripe = getStripe();

      stage = "resolve membership price";
      const price = await resolvePriceForTier(stripe, tierName);

      stage = "identify Stripe customer";
      const customerId = await findOrCreateCustomer(stripe, user, profile);

      stage = "create Stripe Checkout Session";
      const siteUrl = (
        process.env.NEXT_PUBLIC_SITE_URL || "https://strafecrate.com"
      ).replace(/\/$/, "");

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

      if (session.url) {
        return NextResponse.json({
          url: session.url,
          checkout_mode: "session",
        });
      }
    } catch (stripeError) {
      console.error(
        "Stripe Checkout Session unavailable; using linked Payment Link",
        { stage, stripeError },
      );
    }

    // Failsafe: the existing hosted Payment Link still receives the exact
    // authenticated Supabase account ID and locked account email. The Stripe
    // webhook receives client_reference_id and can reconcile the purchase.
    return NextResponse.json({
      url: fallbackUrl,
      checkout_mode: "linked_payment_link",
    });
  } catch (error) {
    const checkoutError = error instanceof CheckoutError ? error : null;
    const baseMessage = error instanceof Error ? error.message : "Unknown server error.";
    const message = checkoutError?.message ?? `Checkout failed while trying to ${stage}: ${baseMessage}`;

    console.error("Create Stripe Checkout Session error", { stage, error });

    return NextResponse.json(
      {
        error: message,
        code: checkoutError?.code ?? "CHECKOUT_SERVER_ERROR",
        stage,
      },
      { status: checkoutError?.status ?? 500 },
    );
  }
}
