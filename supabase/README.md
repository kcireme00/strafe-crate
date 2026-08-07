# Supabase SQL

This directory contains the database schema and feature migrations used by Strafe Crate.

Because the project was built iteratively, some files are cumulative and some are feature-specific. **Do not blindly run every file against production.** Review what has already been applied first.

## Recommended practice

- Keep a production database backup.
- Apply new SQL in chronological/project order.
- Test in a staging Supabase project first.
- After adding or changing RPCs, reload the PostgREST schema cache when necessary.

## SQL inventory

- `2026-08-admin-bans-workspace.sql`
- `2026-08-allow-order-save-without-trade-url.sql`
- `2026-08-business-metrics-live-fix.sql`
- `2026-08-dashboard-chat-rewards-sweep.sql`
- `2026-08-fulfillment-rotation-support-ui.sql`
- `2026-08-launch-sand-dune-event.sql`
- `2026-08-permanent-chat-mute.sql`
- `2026-08-support-tickets-private-reviews.sql`
- `2026-08-threaded-support-tickets.sql`
- `admin-fulfillment-beta.sql`
- `admin-moderation-founder.sql`
- `chat-identity-tier-fix.sql`
- `chat-xp-ledger-hotfix.sql`
- `complete-trophy-profile-tracker.sql`
- `featured-trophy-community-sync.sql`
- `fix-trophies-trade-metrics.sql`
- `launch-readiness-sweep-v2.sql`
- `launch-sweep.sql`
- `loyalty-community.sql`
- `multi-skin-upgrade-program.sql`
- `random-weapon-rotation.sql`
- `stripe-subscription-sync-prestige.sql`
- `trade-url-reward-fulfillment-value.sql`
- `xp-multiplier-125.sql`

Historical rationale for many migrations is preserved in `docs/archive/`.
