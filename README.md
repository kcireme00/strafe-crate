# Strafe Crate Loyalty + Community Update

This update adds:

- Lifetime XP and levels
- A capped loyalty XP multiplier
- Conservative Supply Credits
- Dollar-value transparency for reward contribution
- Three redeemable Supply Caches
- Trophy cabinet and three featured trophy slots
- Public player-card modal
- Authenticated global live chat
- Chat rate limiting, reports, and admin moderation foundation
- Rewards and Community links in the signed-in header
- Stripe-webhook-ready loyalty award function

## 1. Run the SQL first

Open Supabase, SQL Editor, New Query.

Paste and run:

supabase/loyalty-community.sql

The result should say:

Loyalty, rewards, trophies, and community chat created

## 2. Copy the site files

Copy these folders/files into Documents\GitHub\strafe-crate:

- app/community/page.tsx
- app/rewards/page.tsx
- app/globals.css
- components/LiveChat.tsx
- components/LoyaltyPanel.tsx
- components/MemberDashboard.tsx
- components/PublicPlayerCard.tsx
- components/RewardsDashboard.tsx
- components/SiteHeader.tsx
- components/TrophyCabinet.tsx

Choose Replace when prompted.

## 3. Commit and push

Commit message:

Add loyalty rewards trophies and community chat

Push origin. Vercel will deploy automatically.

## Conservative reward economics

Supply Credits per successful renewal:

- Recruit: 1 credit, about $0.18 estimated reward contribution
- Operative: 1 credit, about $0.18
- Vanguard: 2 credits, about $0.35
- Elite: 3 credits, about $0.53
- Master: 4 credits, about $0.70
- Prestige: 6 credits, about $1.05

Rewards:

- Field Supply Cache: 20 credits, $3.50 estimated value
- Veteran Supply Cache: 50 credits, $8.75 estimated value
- Arsenal Cache: 100 credits, $17.50 estimated value

Credits are not cash, cannot be withdrawn, and are not multiplied.

## XP multiplier

- Months 1-2: 1.00x
- Months 3-5: 1.02x
- Months 6-11: 1.04x
- Months 12-23: 1.06x
- Months 24-35: 1.08x
- Month 36+: 1.10x cap

The multiplier applies only to Lifetime XP, which has no cash value.

## Stripe integration later

After Stripe is connected, the successful recurring invoice webhook should call:

award_subscription_loyalty(user_uuid, tier_slug, stripe_invoice_id)

The function is idempotent, meaning the same invoice cannot award loyalty twice.

## Live chat safety

This MVP includes:

- Authenticated members only
- 500-character maximum
- Five-second posting cooldown
- Member reporting
- Admin deletion policy foundation
- Safe public player cards
- No email, Steam trade URL, billing data, or admin notes exposed

Before opening chat broadly, add clear Community Guidelines and assign an admin moderation workflow.
