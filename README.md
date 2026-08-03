# Admin Moderation + Founder Update

## 1. Run the SQL first

Open:

supabase/admin-moderation-founder.sql

Paste the entire file into:

Supabase > SQL Editor > New Query

Then click Run Query.

The final results should show:

- tyler.m.emerick@gmail.com with role `admin`
- Founding Member in featured slot 1

## 2. Copy these files into GitHub

- app/admin/reports/page.tsx
- components/AdminChatReports.tsx
- components/SiteHeader.tsx

## 3. Add the CSS

Open:

admin-reports-styles.css

Copy all of it and paste it at the BOTTOM of your existing:

app/globals.css

Do not replace globals.css with the small CSS file.

## 4. Commit and push

Commit message:

Add admin chat moderation and founder access

## 5. Open the moderation inbox

After deployment:

/admin/reports

Admins can:

- review all chat reports
- delete reported messages
- time users out for 1 hour
- time users out for 24 hours
- time users out for 7 days
- permanently ban users from chat
- remove chat restrictions
- dismiss reports

All actions are recorded in `public.moderation_log`.

## Admin Hub

This package also replaces `/admin` with a tabbed hub containing Overview, Reports, Moderation Log, Members, Orders, and Rewards.
