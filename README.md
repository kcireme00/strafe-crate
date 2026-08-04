# Complete Trophy + Profile + Tier Tracker Update

## 1. Run SQL first

Open:

supabase/complete-trophy-profile-tracker.sql

Paste into Supabase SQL Editor as a NEW query and run it.

## 2. Replace/add GitHub files

Replace:
- components/SiteHeader.tsx

Add:
- components/TrophyEmblem.tsx
- components/TierMemberTracker.tsx
- components/DashboardProfileAndTrophies.tsx
- components/DashboardProfileAndTrophies.module.css

## 3. Dashboard integration

In the dashboard page:

import DashboardProfileAndTrophies from "@/components/DashboardProfileAndTrophies";

Replace the old Profile and Trophy Cabinet sections with:

<DashboardProfileAndTrophies />

## 4. Homepage tier tracker

In the homepage:

import TierMemberTracker from "@/components/TierMemberTracker";

Place this below the six membership cards:

<TierMemberTracker />

Then append the contents of:

tier-member-tracker-styles.css

to the bottom of:

app/globals.css

## 5. What this package does

- removes Reports from the main header
- keeps Reports inside Admin only
- adds 18 trophy definitions
- renders custom silhouette SVG emblems from trophy slugs
- lets members select and save up to three featured trophies
- validates Steam profile and trade URLs
- blocks fulfillment progression until both valid URLs are saved
- adds real live counts for active/trialing members by tier

Commit message:

Add trophy emblems profile readiness and live tier counts
