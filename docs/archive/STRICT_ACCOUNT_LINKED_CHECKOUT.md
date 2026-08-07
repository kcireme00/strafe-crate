# Strict Account-Linked Stripe Checkout

This version intentionally has no raw Payment Link fallback.

Every purchase must be created by `/api/stripe/create-checkout-session` after:

1. Authenticating the Supabase access token.
2. Confirming the member profile exists.
3. Confirming a Steam trade URL is saved.
4. Loading the exact recurring Stripe Price ID from Vercel.
5. Creating/reusing a Stripe Customer with `supabase_user_id` metadata.
6. Creating a Checkout Session with the Supabase user ID and tier on both the
   Checkout Session and Stripe Subscription metadata.

If any step fails, checkout is blocked. A customer cannot pay through this site
without their Strafe Crate account being attached.

## Required Vercel variables

Add the exact recurring Stripe Price IDs from Stripe Product Catalog:

- STRIPE_PRICE_RECRUIT
- STRIPE_PRICE_OPERATIVE
- STRIPE_PRICE_VANGUARD
- STRIPE_PRICE_ELITE
- STRIPE_PRICE_MASTER
- STRIPE_PRICE_PRESTIGE

Each value begins with `price_`.

Existing required server variables:

- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- NEXT_PUBLIC_SITE_URL=https://strafecrate.com

Do not use the old `buy.stripe.com` URLs in the frontend after this update.
