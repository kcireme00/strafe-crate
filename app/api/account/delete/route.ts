import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripeServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authenticate(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) return null;

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  return error ? null : data.user;
}

async function cancelStripeMembership(subscriptionId: string | null) {
  if (!subscriptionId) return;

  const stripe = getStripe();

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (
      ["canceled", "incomplete_expired"].includes(
        String(subscription.status).toLowerCase(),
      )
    ) {
      return;
    }

    if (subscription.schedule) {
      const scheduleId =
        typeof subscription.schedule === "string"
          ? subscription.schedule
          : subscription.schedule.id;

      try {
        await stripe.subscriptionSchedules.cancel(scheduleId);
        return;
      } catch (scheduleError) {
        console.warn(
          "Unable to cancel subscription schedule; cancelling subscription directly.",
          scheduleError,
        );
      }
    }

    await stripe.subscriptions.cancel(subscriptionId);
  } catch (error: any) {
    // Missing/already-deleted subscriptions should not prevent account deletion.
    if (error?.code !== "resource_missing") throw error;
  }
}

async function safeProfileAnonymization(userId: string) {
  const admin = getSupabaseAdmin();

  // Keep this update limited to columns that are part of the core profile
  // model. Optional project columns are intentionally not referenced here.
  const { error } = await admin
    .from("profiles")
    .update({
      full_name: "Deleted Member",
      display_name: "Deleted Member",
      steam_profile_url: null,
      steam_trade_url: null,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Profile anonymization failed: ${error.message}`);
  }
}

async function safeLocalSubscriptionCancellation(userId: string) {
  const admin = getSupabaseAdmin();

  const { error } = await admin
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // A missing local subscription row is fine. A schema/table error should be
  // logged, but Stripe has already been cancelled and auth deletion can proceed.
  if (error) {
    console.warn("Unable to update local subscription record.", error);
  }
}

async function safeChatAnonymization(userId: string) {
  const admin = getSupabaseAdmin();

  const { error } = await admin
    .from("chat_messages")
    .update({
      display_name_snapshot: "Deleted Member",
      tier_name_snapshot: null,
    })
    .eq("user_id", userId);

  // Chat history is optional and should never block account deletion.
  if (error) {
    console.warn("Unable to anonymize historical chat.", error);
  }
}

export async function POST(request: NextRequest) {
  let stage = "authentication";

  try {
    const user = await authenticate(request);

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in again before deleting your account." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { confirmation?: string };

    if (body.confirmation !== "DELETE") {
      return NextResponse.json(
        { error: 'Type "DELETE" exactly to confirm account deletion.' },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    stage = "subscription lookup";
    const { data: subscriptionData, error: subscriptionError } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    // The absence of a local subscription must not block deletion.
    if (subscriptionError) {
      console.warn("Unable to read local subscription.", subscriptionError);
    }

    const subscription = subscriptionData as {
      stripe_subscription_id: string | null;
    } | null;

    stage = "Stripe cancellation";
    await cancelStripeMembership(
      subscription?.stripe_subscription_id ?? null,
    );

    stage = "profile anonymization";
    await safeProfileAnonymization(user.id);

    stage = "history anonymization";
    await safeChatAnonymization(user.id);

    stage = "local subscription cancellation";
    await safeLocalSubscriptionCancellation(user.id);

    stage = "Supabase Auth deletion";
    const { error: deleteError } =
      await admin.auth.admin.deleteUser(user.id, true);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return NextResponse.json({
      ok: true,
      message:
        "Your account was deleted and any active membership was canceled.",
    });
  } catch (error) {
    console.error(`Account deletion failed during ${stage}`, error);

    const detail =
      error instanceof Error ? error.message : "Unknown deletion error.";

    return NextResponse.json(
      {
        error: `Unable to delete the account during ${stage}. ${detail}`,
      },
      { status: 500 },
    );
  }
}
