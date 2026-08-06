# Strafe Crate Launch Candidate

## Required Supabase migration
Run `supabase/launch-sweep.sql` once in the Supabase SQL Editor.

## Required Vercel environment variables
Copy `.env.example` and set the Supabase values plus all six Stripe Payment Link URLs.

## Member experience
- `/dashboard`: membership card, current drop timeline, weapon coverage, compact collector summary, rotation, and history.
- `/rewards`: full XP and Supply Credit progression plus live reward catalog.
- `/trophies`: trophy slot picker and achievement management.
- `/settings`: display name and required Steam delivery URLs.
- `/community`: tier-colored identity, level, and exact saved slot-one trophy emblem.

## Launch checks
1. Create a fresh account and confirm email.
2. Save valid Steam profile and trade URLs under Settings.
3. Test every Stripe Payment Link in test mode.
4. Confirm the subscription webhook creates/updates the subscription and fulfillment order.
5. Confirm the order appears in Admin > Orders and randomize an unused weapon.
6. Move the order through purchasing, ready to send, trade sent, accepted, and fulfilled.
7. Confirm dashboard timeline, weapon history, XP, Supply Credits, trophy unlocks, tier count, and chat identity update.
8. Test cancellation, failed payment, reports, timeout/ban, and reward redemption.

## Build verification note
The repository was syntax-checked locally. A full dependency install/build could not be executed in the editing environment because its npm registry did not contain `@supabase/supabase-js`; Vercel/GitHub should run the final production build using the normal public npm registry.
