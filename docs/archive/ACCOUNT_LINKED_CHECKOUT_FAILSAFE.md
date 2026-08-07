# Account-Linked Checkout Failsafe

The checkout API first attempts a server-created Stripe Checkout Session.
If Stripe cannot resolve the Price behind an older Payment Link, it returns the
existing Payment Link with these authenticated parameters attached:

- client_reference_id = signed-in Supabase user ID
- locked_prefilled_email = signed-in account email

The webhook can therefore reconcile the successful payment with the exact
Strafe Crate account instead of presenting a checkout error.

No SQL changes are required.
