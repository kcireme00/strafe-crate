# Architecture

## Application

The project uses the Next.js App Router.

`app/` contains public pages, signed-in pages, admin pages, and API routes. Reusable interface and feature logic lives in `components/`.

## Authentication

Supabase Auth owns user authentication. Browser code uses the public Supabase client. Privileged operations use the server-only admin client from `lib/supabaseAdmin.ts`.

## Database

Supabase PostgreSQL stores:

- profiles
- memberships/subscriptions
- fulfillment orders and line items
- rewards and loyalty data
- trophies
- community chat and moderation
- support tickets and reviews
- limited-time event claims

User-facing database access should be protected by Row Level Security. Privileged workflows should be handled by admin-only SQL functions or server endpoints.

## Payments

Stripe owns recurring subscriptions. Stripe Checkout and Customer Portal handle payment entry and subscription management. Webhooks synchronize Stripe state into Supabase.

## Fulfillment

Fulfillment remains intentionally admin-controlled. Customer actions create or update application records, while actual Steam trade verification and fulfillment remain manual unless explicitly automated later.

## Admin

The Operations Hub centralizes:

- Orders
- Reports
- Bans
- Tickets
- Reviews
- Events

Admin permissions must be enforced in the backend/database, not only by hiding navigation links.
