# Simple permanent account deletion

The deletion endpoint now performs only the required actions:

1. Authenticate the member.
2. Attempt to cancel the active Stripe subscription.
3. Hard-delete the Supabase Auth user.
4. Allow PostgreSQL `ON DELETE CASCADE` relationships to remove the profile and
   dependent account data.
5. Sign the browser out and clear its stored session.

The endpoint no longer tries to update or anonymize `public.profiles`, which was
the source of the RLS permission error.
