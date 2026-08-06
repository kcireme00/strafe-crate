# Launch Readiness Sweep V2

This update adds:

- Three live Supply Credit rewards and redemption support
- A redesigned live member tracker with isolated CSS-module styling
- Checkout gating until a valid Steam profile URL and Steam trade URL are saved
- Exact trophy-slot persistence, including intentionally empty left or middle slots
- Community posting through a protected RPC only
- Link blocking, configurable blocked terms, automatic 1-hour/24-hour/7-day timeouts, and filter logs
- Admin current-month, fiscal-year, and lifetime revenue/profit cards
- Test orders excluded from business metrics

## Required SQL

Run `supabase/launch-readiness-sweep-v2.sql` as a new Supabase query.

## Revenue metric definition

Recorded revenue is the membership tier monthly price for each non-test valid fulfillment cycle. Recorded profit is revenue minus the acquisition cost saved on that order. Fiscal year is January 1 through December 31.

## Important Stripe limitation

The website now blocks its checkout buttons until fulfillment readiness is true. A customer who somehow obtains a raw Stripe Payment Link could still open it directly. Full server-side enforcement requires a Stripe webhook or Checkout Session endpoint that validates the account before session creation.
