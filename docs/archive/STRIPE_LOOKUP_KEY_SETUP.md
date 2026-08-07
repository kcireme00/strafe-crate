# Stripe Lookup Key Setup

This repository no longer requires these Vercel variables:

- STRIPE_PRICE_RECRUIT
- STRIPE_PRICE_OPERATIVE
- STRIPE_PRICE_VANGUARD
- STRIPE_PRICE_ELITE
- STRIPE_PRICE_MASTER
- STRIPE_PRICE_PRESTIGE

Instead, assign these lookup keys to the active recurring monthly Price for each Stripe product:

| Tier | Monthly amount | Lookup key |
|---|---:|---|
| Recruit | $25 | `strafe_recruit_monthly` |
| Operative | $50 | `strafe_operative_monthly` |
| Vanguard | $75 | `strafe_vanguard_monthly` |
| Elite | $100 | `strafe_elite_monthly` |
| Master | $150 | `strafe_master_monthly` |
| Prestige | $200 | `strafe_prestige_monthly` |

## Stripe dashboard

For each tier:

1. Open **Product catalog**.
2. Open the tier product.
3. Open its active monthly Price.
4. Edit the Price.
5. Expand **More pricing options** if necessary.
6. Set the exact lookup key listed above.
7. Save.

Only one active Price should use each lookup key.

## Required Vercel variables

- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- NEXT_PUBLIC_SITE_URL=https://strafecrate.com

Redeploy after replacing the repository. Lookup keys themselves are configured in Stripe and do not go into Vercel.
