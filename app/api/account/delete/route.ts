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

async function cancelStripeSubscription(subscriptionId: string | null) {
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
          "Could not cancel the schedule; cancelling the subscription directly.",
          scheduleError,
        );
      }
    }

    await stripe.subscriptions.cancel(subscriptionId);
  } catch (error: any) {
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

    // Try to locate and cancel billing first. Failure to read an optional local
    // subscription record does not block deletion.
    const { data: subscriptionData, error: subscriptionError } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionError) {
      console.warn("Local subscription lookup failed.", subscriptionError);
    }

    const stripeSubscriptionId =
      (subscriptionData as { stripe_subscription_id?: string | null } | null)
        ?.stripe_subscription_id ?? null;

    await cancelStripeSubscription(stripeSubscriptionId);

    // Hard-delete the Auth user. The existing profiles foreign key uses
    // ON DELETE CASCADE, so the public profile and dependent account rows are
    // removed by PostgreSQL without a separate RLS-blocked profile update.
    const { error: deleteError } =
      await admin.auth.admin.deleteUser(user.id, false);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return NextResponse.json({
      ok: true,
      message:
        "Your account was permanently deleted and future billing was canceled.",
    });
  } catch (error) {
    console.error("Permanent account deletion failed.", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Unable to delete the account. ${error.message}`
            : "Unable to delete the account.",
      },
      { status: 500 },
    );
  }
}
