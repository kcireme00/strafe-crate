# TrophyCabinet Build Fix

Open:

components/MemberDashboard.tsx

Find:

<TrophyCabinet trophies={trophies} />

Replace it with:

<TrophyCabinet />

The new TrophyCabinet component loads its own trophies from Supabase and does not accept props.

Commit message:

Fix TrophyCabinet dashboard integration
