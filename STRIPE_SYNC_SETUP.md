# Stripe Subscription Sync Setup

## Payment Links wired into the site

- Recruit $25: https://buy.stripe.com/6oUaEY5YQc292HO6iBebu05
- Operative $50: https://buy.stripe.com/eVq00kevmc29dms9uNebu04
- Vanguard $75: https://buy.stripe.com/7sY14o0Ew7LTaag8qJebu03
- Elite $100: https://buy.stripe.com/9B614o3QI5DLeqw5exebu02
- Master $150: https://buy.stripe.com/5kQaEYgDu7LTbekfTbebu01
- Prestige $200: https://buy.stripe.com/3cI7sM0Ewfel1DK0Yhebu00

The site appends the signed-in Supabase user ID as `client_reference_id` and locks the checkout email to the account email. This lets the webhook reconcile a completed Checkout Session to the correct member.

## Vercel environment variables

Set:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Never expose the secret key, webhook secret, or service-role key with a `NEXT_PUBLIC_` prefix.

## Stripe webhook

Create a Stripe webhook endpoint pointing to:

`https://YOUR_DOMAIN/api/stripe/webhook`

Subscribe to:

- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`.

## Customer Portal

Activate and configure Stripe Customer Portal in Stripe Billing settings. Enable:

- cancel at period end
- update payment method
- invoice history
- subscription management

The dashboard button creates a secure portal session for the signed-in member.

## Payment/order behavior

- Successful initial checkout syncs the Stripe customer/subscription to Supabase.
- Every paid invoice creates exactly one monthly fulfillment order using the unique Stripe invoice ID.
- Failed invoices mark the local subscription `past_due` and do not create an order.
- Cancellations and `cancel_at_period_end` changes sync through subscription webhooks.
- Before a newly paid cycle is created, a completed 34/34 rotation automatically prestiges, resets the active rotation, awards 500 XP and 10 Supply Credits, and preserves all history.

## Testing

Use Stripe test mode, Stripe CLI forwarding, test cards, and Stripe test clocks before switching the six links to live mode.
