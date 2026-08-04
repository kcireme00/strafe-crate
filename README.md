# Clean Progression Pages + Community Trophy Sync

## 1. Run SQL first

Open:

supabase/featured-trophy-community-sync.sql

Paste it into Supabase SQL Editor as a NEW query and run it.

## 2. Add files

Add:

- components/DashboardCollectorSummary.tsx
- components/DashboardCollectorSummary.module.css
- components/RewardsProgressPage.tsx
- components/RewardsProgressPage.module.css
- components/TrophiesPage.tsx
- components/TrophiesPage.module.css
- components/CommunityIdentity.tsx
- components/CommunityIdentity.module.css

Replace:

- app/rewards/page.tsx

Add:

- app/trophies/page.tsx

Keep:

- components/TrophyCabinet.tsx
- components/TrophyEmblem.tsx

## 3. Clean MemberDashboard.tsx

Import:

import DashboardCollectorSummary from "@/components/DashboardCollectorSummary";

REMOVE from the dashboard:

- <LoyaltyPanel loyalty={loyalty} />
- <TrophyCabinet />
- <ProfileSettings />
- the old inline Profile and Steam Settings section

ADD only:

<DashboardCollectorSummary />

Recommended dashboard:

1. Player card and current order
2. Monthly fulfillment timeline
3. Collection snapshot / weapon coverage
4. DashboardCollectorSummary
5. Recent activity / drop history

Nothing else.

## 4. Dedicated pages

/rewards:
- full XP
- multiplier
- paid streak
- Supply Credits
- reward catalog

/trophies:
- trophy cabinet
- slot picker
- achievement management

## 5. Community chat identity

Import in LiveChat.tsx:

import CommunityIdentity from "@/components/CommunityIdentity";

Replace the current username / level / membership badges with the component
shown in:

components/CommunityIdentityExample.tsx

The exact saved featured trophy in slot 1 is returned by:

get_public_community_identity(user_id)

This ensures the emblem beside the chat username matches the first trophy shown
on the public player card.

## 6. Commit

Clean progression pages and sync community trophy identity
