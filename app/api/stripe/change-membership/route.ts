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

const tierPrices: Record<TierName, number> = {
  Recruit: 25,
  Operative: 50,
  Vanguard: 75,
  Elite: 100,
  Master: 150,
  Prestige: 200,
};

const stripePriceEnvKeys: Record<TierName, string> = {
  Recruit: "STRIPE_PRICE_RECRUIT",
  Operative: "STRIPE_PRICE_OPERATIVE",
  Vanguard: "STRIPE_PRICE_VANGUARD",
  Elite: "STRIPE_PRICE_ELITE",
  Master: "STRIPE_PRICE_MASTER",
  Prestige: "STRIPE_PRICE_PRESTIGE",
};

function isTierName(value: string): value is TierName {
  return Object.prototype.hasOwnProperty.call(tierPrices, value);
}

async function authenticate(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) return null;
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  return error ? null : data.user;
}

function configuredPriceId(tier: TierName) {
  const key = stripePriceEnvKeys[tier];
  const value = process.env[key]?.trim();
  if (!value?.startsWith("price_")) {
    throw new Error(`${key} is missing or invalid in Vercel.`);
  }
  return value;
}

async function scheduleDowngrade(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  subscriptionItemId: string,
  currentPriceId: string,
  targetPriceId: string,
) {
  const subscriptionAny = subscription as any;
  const itemAny = subscription.items.data[0] as any;
  const periodStart =
    subscriptionAny.current_period_start ?? itemAny.current_period_start;
  const periodEnd =
    subscriptionAny.current_period_end ?? itemAny.current_period_end;

  if (!periodStart || !periodEnd) {
    throw new Error("Stripe did not return the current billing-period dates.");
  }

  let schedule: Stripe.SubscriptionSchedule;

  if (subscription.schedule) {
    const scheduleId =
      typeof subscription.schedule === "string"
        ? subscription.schedule
        : subscription.schedule.id;
    schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
  } else {
    schedule = await stripe.subscriptionSchedules.create({
      from_subscription: subscription.id,
    });
  }

  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    phases: [
      {
        start_date: periodStart,
        end_date: periodEnd,
        items: [{ price: currentPriceId, quantity: 1 }],
        proration_behavior: "none",
      },
      {
        start_date: periodEnd,
        items: [{ price: targetPriceId, quantity: 1 }],
        proration_behavior: "none",
      },
    ],
    metadata: {
      supabase_user_id:
        subscription.metadata.supabase_user_id ?? "",
      pending_membership_tier:
        Object.entries(stripePriceEnvKeys).find(
          ([, envKey]) => process.env[envKey]?.trim() === targetPriceId,
        )?.[0] ?? "",
    },
  } as any);

  return periodEnd;
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: "Please sign in again." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { tier?: string };
    const targetTierRaw = body.tier?.trim() ?? "";
    if (!isTierName(targetTierRaw)) {
      return NextResponse.json(
        { error: "Invalid membership tier." },
        { status: 400 },
      );
    }
    const targetTier = targetTierRaw;

    const admin = getSupabaseAdmin();
    const { data: localSubscription, error: localError } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id,status,tier_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (localError) throw localError;
    if (
      !localSubscription?.stripe_subscription_id ||
      !["active", "trialing", "past_due"].includes(
        String(localSubscription.status ?? "").toLowerCase(),
      )
    ) {
      return NextResponse.json(
        { error: "No active Stripe membership was found." },
        { status: 409 },
      );
    }

    const { data: currentTier, error: tierError } = await admin
      .from("membership_tiers")
      .select("name,monthly_price_cents")
      .eq("id", localSubscription.tier_id)
      .maybeSingle();

    if (tierError) throw tierError;
    if (!currentTier?.name || !(currentTier.name in tierPrices)) {
      throw new Error("Your current membership tier could not be identified.");
    }

    const currentTierName = currentTier.name as TierName;
    if (currentTierName === targetTier) {
      return NextResponse.json(
        { error: `You are already subscribed to ${targetTier}.` },
        { status: 409 },
      );
    }

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(
      localSubscription.stripe_subscription_id,
      { expand: ["items.data.price"] },
    );

    const existingItem = subscription.items.data[0];
    if (!existingItem) {
      throw new Error("The Stripe subscription has no subscription item.");
    }

    const currentPriceId =
      typeof existingItem.price === "string"
        ? existingItem.price
        : existingItem.price.id;
    const targetPriceId = configuredPriceId(targetTier);

    const isUpgrade = tierPrices[targetTier] > tierPrices[currentTierName];

    if (isUpgrade) {
      const updated = await stripe.subscriptions.update(subscription.id, {
        items: [
          {
            id: existingItem.id,
            price: targetPriceId,
            quantity: 1,
          },
        ],
        proration_behavior: "always_invoice",
        payment_behavior: "pending_if_incomplete",
        metadata: {
          ...subscription.metadata,
          supabase_user_id: user.id,
          membership_tier: targetTier,
          membership_change: "immediate_upgrade",
        },
        expand: ["latest_invoice"],
      });

      return NextResponse.json({
        ok: true,
        action: "upgraded",
        tier: targetTier,
        message:
          `Your membership is changing to ${targetTier}. Stripe will charge only the prorated difference for the current billing period. Your next renewal will be $${tierPrices[targetTier]}.`,
        subscription_status: updated.status,
      });
    }

    const effectiveAt = await scheduleDowngrade(
      stripe,
      subscription,
      existingItem.id,
      currentPriceId,
      targetPriceId,
    );

    return NextResponse.json({
      ok: true,
      action: "scheduled",
      tier: targetTier,
      effective_at: new Date(effectiveAt * 1000).toISOString(),
      message:
        `Your switch to ${targetTier} is scheduled for your next renewal. Your current ${currentTierName} benefits remain active until then.`,
    });
  } catch (error) {
    console.error("Stripe membership change failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to change membership.",
      },
      { status: 500 },
    );
  }
}
