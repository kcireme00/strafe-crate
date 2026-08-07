# Revenue and profit live-update fix

The metrics RPC now calculates acquisition cost from `fulfillment_order_items` on every request. The copied `fulfillment_orders.acquisition_cost` value is used only when an order has no line-item rows.

After Admin saves an order, the order queue reloads first and then emits the metrics-refresh event. The metrics panel runs an immediate refresh plus one short delayed refresh.

Run `supabase/2026-08-business-metrics-live-fix.sql` once.
