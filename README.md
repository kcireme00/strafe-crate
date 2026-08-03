# Chat Username + Tier Color Fix

## 1. Run the SQL first

Open Supabase > SQL Editor > New Query.

Paste and run:

supabase/chat-identity-tier-fix.sql

This:
- installs the missing chat trigger
- uses the member's display name, then full name, then email prefix
- adds their active subscription tier
- calculates their level from Lifetime XP
- repairs existing messages that display "Pending"

## 2. Copy the website files

Replace:

- components/LiveChat.tsx
- app/globals.css

## 3. Commit and push

Commit message:

Fix chat usernames and tier styling

The chat colors are:
- Recruit: silver
- Operative: blue
- Vanguard: green
- Elite: purple
- Master: gold
- Prestige: crimson
- Membership pending: orange
