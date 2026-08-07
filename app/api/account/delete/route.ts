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
    // A missing/already-deleted Stripe subscription should not block
    // deletion of the Strafe Crate account.
    if (error?.code !== "resource_missing") throw error;
  }
}

export async function POST(request: NextRequest) {
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

    const { data: subscriptionData, error: subscriptionError } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;

    const subscription = subscriptionData as {
      stripe_subscription_id: string | null;
    } | null;

    // Stop all future Stripe billing before removing account access.
    await cancelStripeMembership(
      subscription?.stripe_subscription_id ?? null,
    );

    // Keep fulfillment/payment rows for accounting, dispute, and support
    // purposes, but remove direct identifying profile data.
    const deletedEmail = `deleted+${user.id}@deleted.strafecrate.invalid`;

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name: "Deleted Member",
        display_name: "Deleted Member",
        email: deletedEmail,
        steam_profile_url: null,
        steam_trade_url: null,
        stripe_customer_id: null,
        account_approved: false,
        fulfillment_ready: false,
      })
      .eq("id", user.id);

    if (profileError) throw profileError;

    // Remove public identity from historical chat while preserving moderation
    // and audit records.
    const { error: chatError } = await admin
      .from("chat_messages")
      .update({
        display_name_snapshot: "Deleted Member",
        tier_name_snapshot: null,
      })
      .eq("user_id", user.id);

    if (chatError) {
      console.warn("Unable to anonymize historical chat.", chatError);
    }

    const { error: localSubscriptionError } = await admin
      .from("subscriptions")
      .update({
        status: "canceled",
        cancel_at_period_end: false,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (localSubscriptionError) throw localSubscriptionError;

    // Soft deletion is irreversible and removes the user's ability to log in,
    // while retaining a hashed identifier for record integrity.
    const { error: deleteError } =
      await admin.auth.admin.deleteUser(user.id, true);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      ok: true,
      message:
        "Your account was deleted and any active membership was canceled.",
    });
  } catch (error) {
    console.error("Account deletion failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete the account.",
      },
      { status: 500 },
    );
  }
}
