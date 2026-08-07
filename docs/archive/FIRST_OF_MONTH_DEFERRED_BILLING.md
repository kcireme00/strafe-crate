# First-of-month deferred billing

A member who signs up after the first:

1. Completes Stripe Checkout and supplies a payment method.
2. Is not charged during Checkout.
3. Receives a trialing subscription through the first of the next month.
4. Is charged the full selected membership price on the first.
5. Gets a fulfillment order only after that positive invoice is paid.

Example:
- Checkout: August 7
- Charge: September 1
- First fulfillment cycle: September
- Following charge: October 1

Fulfillment protection:
- `checkout.session.completed` only links and syncs the subscription.
- A zero-dollar trial invoice never creates an order.
- Only `invoice.paid` with `amount_paid > 0` creates fulfillment.
