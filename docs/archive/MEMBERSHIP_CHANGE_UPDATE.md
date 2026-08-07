# Membership Change Update — Next-Cycle Only

## Core rule

Every membership change takes effect at the next successful renewal.

This applies to both:

- Upgrades
- Downgrades

The current paid cycle is never changed. An existing or fulfilled order is never
overwritten by a membership change.

## Example

A member currently has Recruit and already received the Recruit order.

They select Elite.

- Recruit remains active through the current paid period.
- The current Recruit fulfillment order remains unchanged.
- Stripe schedules Elite for the next renewal.
- On the next successful renewal, Stripe charges $100.
- The webhook updates the subscription to Elite.
- A new Elite fulfillment order is created for that new cycle.

## Stripe behavior

The API uses a Stripe Subscription Schedule with:

1. Current Price through `current_period_end`
2. Selected Price beginning exactly at `current_period_end`
3. No proration and no immediate invoice

This avoids:

- Double subscriptions
- Mid-cycle charges
- Changing fulfilled orders
- Duplicate fulfillment orders
- Proration confusion

## Member UI

- Current tier: orange border and red Cancel Membership button
- Higher tiers: Upgrade
- Lower tiers: Downgrade
- Confirmation explains the selected change begins next billing cycle

No additional SQL is required.
