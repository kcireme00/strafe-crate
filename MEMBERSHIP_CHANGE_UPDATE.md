# Membership Change Update

## Member-facing behavior

- Current membership is highlighted orange.
- Current tier only shows `Cancel membership`.
- Higher tiers show `Upgrade to ...`.
- Lower tiers show `Downgrade to ...`; the confirmation explains that the downgrade begins at the next renewal.
- New visitors still receive normal account-linked Checkout.

## Stripe behavior

### Upgrade
The API updates the existing subscription item using its existing item ID.

- The old Price is replaced.
- Stripe invoices the prorated difference.
- The billing date stays unchanged.
- The next renewal uses only the new tier price.
- It does not create a second subscription or add both prices.

### Downgrade
A Stripe Subscription Schedule keeps the current plan through the paid period
and changes to the lower tier at the next renewal.

### Cancellation
The current-tier cancellation button opens the Stripe Customer Portal.

## Webhook behavior

A paid `subscription_update` invoice updates the existing current-cycle order
instead of generating a second fulfillment order.

## Required environment variables

- STRIPE_PRICE_RECRUIT
- STRIPE_PRICE_OPERATIVE
- STRIPE_PRICE_VANGUARD
- STRIPE_PRICE_ELITE
- STRIPE_PRICE_MASTER
- STRIPE_PRICE_PRESTIGE
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- NEXT_PUBLIC_SITE_URL

No additional SQL is required.
