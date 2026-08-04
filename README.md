# Dashboard UI Cleanup

No SQL is required.

## Add/replace

Add:

- components/CompactCollectorProgress.tsx
- components/CompactCollectorProgress.module.css
- components/RewardsHub.tsx
- components/RewardsHub.module.css

Replace:

- app/rewards/page.tsx

## Update MemberDashboard.tsx

Import:

import CompactCollectorProgress from "@/components/CompactCollectorProgress";

Remove these full dashboard sections:

<LoyaltyPanel loyalty={loyalty} />
<TrophyCabinet />

Replace them with:

<CompactCollectorProgress />

Do not render ProfileSettings in the middle of the main dashboard. Put it below
Drop History, or later move it to a dedicated Settings page.

## Recommended main dashboard order

1. Player card
2. Current monthly drop and timeline
3. Collection snapshot
4. CompactCollectorProgress
5. Recent activity
6. ProfileSettings at the bottom

The full XP panel and Trophy Cabinet now live on /rewards.

Commit:

Clean dashboard and move progression to rewards
