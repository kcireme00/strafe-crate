# Trophy Slot Picker + Live Tracker Fix

No new SQL is required if you already ran:

complete-trophy-profile-tracker.sql

## Replace/add these files

- components/TrophyCabinet.tsx
- components/TrophyCabinet.module.css
- components/ProfileSettings.tsx
- components/ProfileSettings.module.css
- components/TierMemberTracker.tsx

Keep the existing:

- components/TrophyEmblem.tsx

## Dashboard integration

Remove the old combined trophy/profile component.

Import:

import ProfileSettings from "@/components/ProfileSettings";
import TrophyCabinet from "@/components/TrophyCabinet";

Render them as separate dashboard sections:

<ProfileSettings />

<TrophyCabinet />

Keep your existing Collector Progression / XP component between them or in its
own dashboard tab.

Suggested order:

1. Player card and current order
2. Collector progression / XP
3. Trophy Cabinet
4. Profile and Steam Settings
5. Weapon rotation
6. Drop history

## Live tier tracker

The tier tracker will not appear merely because the component exists.

Open your homepage file, usually:

app/page.tsx

Add:

import TierMemberTracker from "@/components/TierMemberTracker";

Then place this below the six membership cards:

<TierMemberTracker />

Also ensure the tier tracker CSS from the previous complete package was pasted
at the bottom of app/globals.css.

## Trophy interaction

- No trophy list is displayed below the slots.
- Click slot 1, 2, or 3.
- A modal opens with only unlocked trophies.
- Select a trophy for that slot.
- Save the three featured selections.
- Selecting a trophy already used elsewhere moves it to the new slot.

Commit:

Use slot picker for trophies and mount live tier tracker
