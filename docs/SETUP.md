# Setup

## Required environment variables

Create `.env.local` locally and configure the same values in Vercel.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Use the exact variable names referenced by the project if additional variables are present in your current Vercel environment.

## Supabase

The `supabase/` directory contains the database SQL used by the application. It includes schema changes, RLS policies, RPC functions, fulfillment logic, support tooling, moderation, rewards, and launch-event features.

Before running SQL:

1. Back up the database.
2. Run migrations in a non-production project when possible.
3. Review the SQL file before execution.
4. Run only migrations not already applied.
5. Reload the PostgREST schema cache when required.

See `supabase/README.md` for the migration index.

## Stripe

Stripe handles subscription billing and hosted payment flows. The application should never store raw card data.

Production checklist:

- Live Stripe keys in Vercel
- Correct live Price IDs
- Webhook endpoint configured
- Webhook signature verification enabled
- Customer portal configured
- First-of-month subscription behavior tested end-to-end

## Verification

Before launch, test:

Account creation → email verification → login → Steam Trade URL → subscription → webhook → fulfillment order → admin fulfillment → dashboard update → membership change → cancellation.
