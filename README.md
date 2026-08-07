# Strafe Crate

Strafe Crate is a Next.js membership platform for recurring CS2 skin fulfillment, member progression, community features, support, and admin operations.

## Stack

- **Frontend / App:** Next.js + TypeScript
- **Hosting:** Vercel
- **Auth / Database:** Supabase
- **Payments:** Stripe
- **Transactional data:** PostgreSQL through Supabase
- **Steam fulfillment:** Admin-managed trade workflow

## Project structure

```text
app/                Next.js routes, pages, API endpoints, and global styles
components/         Reusable UI and feature components
lib/                Shared client/server utilities
public/             Static assets
supabase/           Database schema, functions, policies, and feature migrations
docs/               Current project documentation
docs/archive/       Historical implementation notes kept for reference
```

## Core product areas

- Membership checkout and first-of-month billing
- Dashboard and fulfillment history
- Weapon rotation and prestige
- XP, rewards, and trophy cabinet
- Community chat and moderation
- Support tickets and private reviews
- Admin fulfillment, reports, bans, tickets, reviews, and events
- Limited-time promotional events
- Stripe subscription management
- Account deletion

## Local development

1. Copy `.env.example` to `.env.local`.
2. Add your Supabase and Stripe credentials.
3. Install dependencies with `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

See `docs/SETUP.md` for environment variables and database setup.

## Production

Deploy through Vercel. Keep all secret credentials server-side. Never expose the Supabase service-role key or Stripe secret key to the browser.

See `docs/SECURITY.md` before launch.
