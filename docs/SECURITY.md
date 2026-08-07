# Security Checklist

## Secrets

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.
- Never expose `STRIPE_SECRET_KEY`.
- Never commit `.env.local`.
- Keep production secrets only in trusted server environments such as Vercel environment variables.

## Supabase

- Enable RLS on every user-data table.
- Verify members can only access their own rows.
- Verify admin-only RPCs call `public.is_admin()` or an equivalent backend check.
- Prefer `SECURITY DEFINER` only where necessary and use an explicit `search_path`.
- Review grants as well as RLS policies.

## Stripe

- Verify webhook signatures.
- Do not accept client-supplied Stripe customer/subscription IDs as trusted ownership proof.
- Derive subscription ownership from the authenticated user on the server.
- Use Stripe-hosted Checkout/Portal for payment data.

## Application

- Authenticate every protected API route.
- Enforce authorization server-side.
- Validate inputs.
- Rate-limit abuse-prone endpoints where appropriate.
- Keep dependencies updated.
- Enable MFA on GitHub, Vercel, Supabase, Stripe, and the business email account.

## Before launch

Perform a route-by-route and table-by-table security review, including:

- `/api/*`
- admin RPCs
- membership change routes
- account deletion
- support tickets
- chat moderation
- fulfillment
- promotional event claims
