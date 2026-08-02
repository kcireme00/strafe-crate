# Strafe Crate working authentication build

This build uses Supabase's browser session persistence and your existing Row Level Security policies. It avoids the cookie handoff problem from the previous attempt.

## Deploy correctly

Upload the folder whose top level contains:

- package.json
- app
- components
- lib
- public

In Vercel, the Root Directory must be blank.

## Environment variables

Add these to this project, not only Shared variables:

NEXT_PUBLIC_SUPABASE_URL=https://owsdxucrpwpvhwprehgx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your full sb_publishable key
NEXT_PUBLIC_SITE_URL=https://your-current-vercel-domain.vercel.app

## Supabase URLs

Authentication, URL Configuration:

Site URL:
https://your-current-vercel-domain.vercel.app

Redirect URLs:
https://your-current-vercel-domain.vercel.app/auth/callback
https://your-current-vercel-domain.vercel.app/reset-password

## Admin account

Run in Supabase SQL Editor:

update public.profiles
set role = 'admin', account_approved = true
where email = 'nightscreamer10@gmail.com';

## Test order

1. Open /login.
2. Log in with the already-confirmed account.
3. Confirm /dashboard stays open.
4. Save the Steam trade URL.
5. Open /admin after promoting the account.

Stripe is intentionally not connected in this build. Authentication and real database reads/writes should be proven first.
