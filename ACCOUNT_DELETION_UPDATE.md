# Account deletion

Settings now includes a Danger Zone.

Deletion requires:
- an authenticated session
- typing `DELETE`
- a final browser confirmation

The server:
1. Cancels any active Stripe subscription or subscription schedule immediately.
2. Anonymizes the public profile and historical chat identity.
3. Marks the local membership canceled.
4. Soft-deletes the Supabase Auth user.
5. Signs the browser out and clears local session storage.

Payment and fulfillment records remain in anonymized form for accounting,
disputes, refunds, chargebacks, and legal recordkeeping.
