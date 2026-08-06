# Account-linked checkout runtime fix

This version removes the checkout route's dependency on the optional
`profiles.stripe_customer_id` column.

It identifies Stripe customers through secure `supabase_user_id` metadata and
returns the exact failed stage/message to the membership page.

No SQL is required.

After deployment, click Recruit again. If Stripe still refuses checkout, the
popup will identify whether the issue is the profile lookup, Stripe key,
Payment Link/Price lookup, customer creation, or Checkout Session creation.
