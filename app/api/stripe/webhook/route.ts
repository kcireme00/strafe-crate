import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripeServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tierByAmount: Record<number, string> = {
  2500: "Recruit",
  5000: "Operative",
  7500: "Vanguard",
  10000: "Elite",
  15000: "Master",
  20000: "Prestige",
};

function isoFromUnix(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function monthStartFromUnix(value?: number | null) {
  const date = value ? new Date(value * 1000) : new Date();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function dueDateForCycle(cycle: string) {
  const [year, month] = cycle.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 14)).toISOString().slice(0, 10);
}

async function alreadyProcessed(eventId: string) {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();
  return Boolean(data);
}

async function markProcessed(event: Stripe.Event) {
  const admin = getSupabaseAdmin();
  await admin.from("stripe_webhook_events").upsert({
    event_id: event.id,
    event_type: event.type,
    processed_at: new Date().toISOString(),
  });
}

async function resolveUserId(
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null,
  clientReferenceId?: string | null,
) {
  if (clientReferenceId) return clientReferenceId;

  const admin = getSupabaseAdmin();
  if (stripeSubscriptionId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .maybeSingle();
    if (data?.user_id) return data.user_id as string;
  }

  if (stripeCustomerId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  return null;
}

async function syncSubscription(
  userId: string,
  subscription: Stripe.Subscription,
  fallbackAmount?: number | null,
) {
  const admin = getSupabaseAdmin();
  const subscriptionAny = subscription as any;
  const firstItem = subscription.items.data[0] as any;
  const amount = firstItem?.price?.unit_amount ?? fallbackAmount ?? 0;
  const tierName = tierByAmount[amount];

  if (!tierName) {
    throw new Error(`No membership tier matches Stripe amount ${amount}.`);
  }

  const { data: tier, error: tierError } = await admin
    .from("membership_tiers")
    .select("id,name,monthly_price_cents")
    .eq("monthly_price_cents", amount)
    .maybeSingle();
  if (tierError) throw tierError;
  if (!tier) throw new Error(`Membership tier ${tierName} is missing in Supabase.`);

  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id;

  const periodStart = subscriptionAny.current_period_start ?? firstItem?.current_period_start;
  const periodEnd = subscriptionAny.current_period_end ?? firstItem?.current_period_end;

  const { error: profileError } = await admin
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId);
  if (profileError) throw profileError;

  const { error: subscriptionError } = await admin
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        tier_id: tier.id,
        status: subscription.status,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: firstItem?.price?.id ?? null,
        current_period_start: isoFromUnix(periodStart),
        current_period_end: isoFromUnix(periodEnd),
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (subscriptionError) throw subscriptionError;

  return { tierName, amount, periodStart, periodEnd };
}

async function createPaidCycleOrder(
  userId: string,
  subscription: Stripe.Subscription,
  invoice: Stripe.Invoice,
) {
  const admin = getSupabaseAdmin();
  const sync = await syncSubscription(userId, subscription, invoice.amount_paid);

  await admin.rpc("process_automatic_prestige", { target_user_id: userId });

  const cycleMonth = monthStartFromUnix(sync.periodStart);
  const { data: rotation } = await admin
    .from("member_rotation_state")
    .select("current_cycle")
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await admin.from("fulfillment_orders").upsert(
    {
      user_id: userId,
      cycle_month: cycleMonth,
      billing_cycle: cycleMonth,
      delivery_due_date: dueDateForCycle(cycleMonth),
      tier_name: sync.tierName,
      membership_value: sync.amount / 100,
      status: "needs_assignment",
      order_type: "membership",
      stripe_invoice_id: invoice.id,
      rotation_cycle: rotation?.current_cycle ?? 1,
      is_test: false,
      admin_notes: `Created automatically from paid Stripe invoice ${invoice.id}.`,
    },
    { onConflict: "stripe_invoice_id", ignoreDuplicates: true },
  );

  if (error) throw error;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription" || !session.subscription) return;

  const stripe = getStripe();
  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription.id;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const userId = await resolveUserId(customerId, subscriptionId, session.client_reference_id);
  if (!userId) throw new Error("Unable to match Stripe checkout to a Strafe Crate user.");

  // Checkout only saves the payment method and creates a trialing subscription.
  // Fulfillment is created only after a positive paid invoice on the first.
  await syncSubscription(userId, subscription, session.amount_total);
}


async function updateCurrentCycleForMembershipChange(
  userId: string,
  subscription: Stripe.Subscription,
  invoice: Stripe.Invoice,
) {
  const admin = getSupabaseAdmin();
  const sync = await syncSubscription(userId, subscription, invoice.amount_paid);
  const cycleMonth = monthStartFromUnix(sync.periodStart);

  const { error } = await admin
    .from("fulfillment_orders")
    .update({
      tier_name: sync.tierName,
      membership_value: sync.amount / 100,
      updated_at: new Date().toISOString(),
      admin_notes:
        `Membership changed to ${sync.tierName}. Stripe proration invoice ${invoice.id} was paid; the existing cycle order was updated rather than duplicated.`,
    })
    .eq("user_id", userId)
    .eq("cycle_month", cycleMonth)
    .eq("order_type", "membership");

  if (error) throw error;
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const invoiceAny = invoice as any;
  const subscriptionId = typeof invoiceAny.subscription === "string"
    ? invoiceAny.subscription
    : invoiceAny.subscription?.id ?? invoiceAny.parent?.subscription_details?.subscription ?? null;
  if (!subscriptionId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
  const userId = await resolveUserId(customerId, subscriptionId);
  if (!userId) throw new Error("Unable to match paid invoice to a Strafe Crate user.");

  // Stripe can emit invoice.paid for a $0 trial invoice.
  // Sync the subscription, but never create fulfillment until money was collected.
  if ((invoice.amount_paid ?? 0) <= 0) {
    await syncSubscription(userId, subscription, invoice.amount_paid);
    return;
  }

  const billingReason = (invoice as any).billing_reason;
  if (billingReason === "subscription_update") {
    await updateCurrentCycleForMembershipChange(
      userId,
      subscription,
      invoice,
    );
    return;
  }

  await createPaidCycleOrder(userId, subscription, invoice);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id ?? null;
  const userId = await resolveUserId(customerId, subscription.id);
  if (!userId) return;
  await syncSubscription(userId, subscription);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 400 });
  }

  try {
    const payload = await request.text();
    const event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);

    if (await alreadyProcessed(event.id)) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceAny = invoice as any;
        const subscriptionId = typeof invoiceAny.subscription === "string"
          ? invoiceAny.subscription
          : invoiceAny.subscription?.id ?? invoiceAny.parent?.subscription_details?.subscription ?? null;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
        const userId = await resolveUserId(customerId, subscriptionId);
        if (userId) {
          await getSupabaseAdmin()
            .from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("user_id", userId);
        }
        break;
      }
      default:
        break;
    }

    await markProcessed(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
