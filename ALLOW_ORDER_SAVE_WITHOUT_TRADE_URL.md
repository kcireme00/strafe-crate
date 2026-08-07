# Save fulfillment orders without a Steam trade URL

The Admin Orders Queue can now save any order whenever an admin selects
**Save order**, even if the member has not entered a valid Steam trade URL.

The member can still be reminded to add a trade URL, but it is no longer a
database requirement for:

- saving skin details
- saving acquisition cost
- changing order status
- saving Trade ID
- saving admin notes

Run `supabase/2026-08-allow-order-save-without-trade-url.sql` once.
