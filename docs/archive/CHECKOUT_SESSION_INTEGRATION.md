# Account-linked Stripe Checkout

The homepage no longer redirects directly to raw Payment Links.

Flow:

1. Member signs into Strafe Crate.
2. Member saves a valid Steam trade URL.
3. Membership button calls `/api/stripe/create-checkout-session` with the member's Supabase access token.
4. Server validates the user with Supabase.
5. Server finds the recurring Stripe Price behind the existing Payment Link.
6. Server creates/reuses a Stripe Customer with `supabase_user_id` metadata.
7. Server creates a Stripe Checkout Session with:
   - `client_reference_id`
   - `metadata.supabase_user_id`
   - `metadata.membership_tier`
   - subscription metadata with the same values
8. Stripe webhook activates the correct account and creates the paid-cycle order.

Required Vercel variables:

- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- NEXT_PUBLIC_SITE_URL=https://strafecrate.com

No Stripe Price IDs are required because the route resolves the recurring price from the six existing Payment Links through Stripe's API.

Test:

1. Redeploy.
2. Sign in to Strafe Crate.
3. Save Steam trade URL.
4. Click Recruit.
5. Confirm Stripe Checkout email matches the signed-in account.
6. Complete payment.
7. Verify green 200 events in Stripe Workbench.
8. Verify membership and fulfillment order in Strafe Crate.
