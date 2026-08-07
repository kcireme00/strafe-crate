# Trophy, Steam Trade Link, and Metrics Hotfix

1. Run `supabase/fix-trophies-trade-metrics.sql` as a new Supabase query.
2. Deploy this repository.

Changes:
- fixes ambiguous `featured_slot` error and preserves empty trophy slots
- makes a member name in Orders Queue open their saved Steam trade URL
- automatically refreshes business metrics after an order is saved
- adds refreshing state and last-updated timestamp
- forces each metrics RPC call to read current committed values

Important: business revenue is the membership payment amount. Steam Value is the
reference value of the delivered item and does not change revenue. Changing the
recorded acquisition cost or tier and clicking Save changes profit metrics.
