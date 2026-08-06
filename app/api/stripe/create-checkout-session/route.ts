import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripeServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TierName =
  | "Recruit"
  | "Operative"
  | "Vanguard"
  | "Elite"
  | "Master"
  | "Prestige";

const stripeLookupKeys: Record<TierName, string> = {
  Recruit: "strafe_recruit_monthly",
  Operative: "strafe_operative_monthly",
  Vanguard: "strafe_vanguard_monthly",
  Elite: "strafe_elite_monthly",
  Master: "strafe_master_monthly",
  Prestige: "strafe_prestige_monthly",
};

const expectedAmounts: Record<TierName, number> = {
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

function isTierName(value: string): value is TierName {
  return Object.prototype.hasOwnProperty.call(stripeLookupKeys, value);
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

async function findPriceByLookupKey(
  stripe: Stripe,
  tierName: TierName,
): Promise<Stripe.Price> {
  const lookupKey = stripeLookupKeys[tierName];

  const prices = await stripe.prices.list({
    active: true,
    lookup_keys: [lookupKey],
    limit: 10,
    expand: ["data.product"],
  });

  const matching = prices.data.filter(
    (price) =>
      Boolean(price.recurring) &&
      price.currency.toLowerCase() === "usd" &&
      price.unit_amount === expectedAmounts[tierName],
  );

  if (matching.length === 0) {
    throw new CheckoutError(
      `Stripe lookup key ${lookupKey} is not assigned to an active $${expectedAmounts[tierName] / 100}/month Price. Add that lookup key to the ${tierName} recurring Price in Stripe.`,
      "LOOKUP_KEY_NOT_FOUND",
      500,
    );
  }

  if (matching.length > 1) {
    throw new CheckoutError(
      `Stripe lookup key ${lookupKey} matches more than one active recurring Price. Leave the lookup key on only the current ${tierName} Price.`,
      "LOOKUP_KEY_DUPLICATE",
      500,
    );
  }

  return matching[0];
}

async function findOrCreateCustomer(
  stripe: Stripe,
  user: { id: string; email?: string | null },
  profile: {
    email?: string | null;
    display_name?: string | null;
    full_name?: string | null;
  },
) {
  try {
    const result = await stripe.customers.search({
      query: `metadata['supabase_user_id']:'${user.id}'`,
      limit: 1,
    });
    const existing = result.data[0];
    if (existing && !existing.deleted) return existing.id;
  } catch (error) {
    console.warn("Stripe customer metadata search unavailable:", error);
  }

  const email = user.email ?? profile.email ?? undefined;
  if (email) {
    const customers = await stripe.customers.list({ email, limit: 100 });
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

export async function POST(request: NextRequest) {
  let stage = "authenticate the member";

  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new CheckoutError(
        "Please sign in again before checkout.",
        "AUTH_REQUIRED",
        401,
      );
    }

    stage = "validate the membership tier";
    const body = (await request.json()) as { tier?: string };
    const requestedTier = body.tier?.trim() ?? "";
    if (!isTierName(requestedTier)) {
      throw new CheckoutError(
        "Invalid membership tier.",
        "INVALID_TIER",
        400,
      );
    }
    const tierName = requestedTier;

    stage = "load the member profile";
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
      throw new CheckoutError(
        "Member profile not found.",
        "PROFILE_NOT_FOUND",
        404,
      );
    }
    if (!profile.steam_trade_url?.trim()) {
      throw new CheckoutError(
        "Save your Steam trade URL before starting checkout.",
        "PROFILE_REQUIRED",
        409,
      );
    }

    stage = "connect to Stripe";
    const stripe = getStripe();

    stage = "find the Stripe Price by lookup key";
    const price = await findPriceByLookupKey(stripe, tierName);

    stage = "identify the Stripe customer";
    const customerId = await findOrCreateCustomer(stripe, user, profile);

    stage = "create the linked Stripe Checkout Session";
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
        checkout_source: "strafe_crate_account_linked_api",
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          membership_tier: tierName,
          checkout_source: "strafe_crate_account_linked_api",
        },
      },
    });

    if (!session.url) {
      throw new CheckoutError(
        "Stripe created a Checkout Session without a redirect URL.",
        "CHECKOUT_URL_MISSING",
      );
    }

    return NextResponse.json({
      url: session.url,
      checkout_mode: "account_linked_api_session",
    });
  } catch (error) {
    const checkoutError = error instanceof CheckoutError ? error : null;
    const baseMessage =
      error instanceof Error ? error.message : "Unknown server error.";
    const message =
      checkoutError?.message ?? `Checkout failed while trying to ${stage}: ${baseMessage}`;

    console.error("Create account-linked Stripe Checkout Session error", {
      stage,
      error,
    });

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
