# Admin Hub + Fulfillment Beta

## 1. Run SQL

Open:

supabase/admin-fulfillment-beta.sql

Paste into Supabase SQL Editor and run it.

The final result should say:

fulfillment_orders

## 2. Copy to GitHub

Replace/add:

- app/admin/page.tsx
- components/AdminFulfillmentBeta.tsx

This admin page expects the existing:

- components/AdminChatReports.tsx

from the earlier moderation package.

## 3. Add styles

Open:

admin-hub-fulfillment-styles.css

Copy everything and paste it at the BOTTOM of:

app/globals.css

Do not replace globals.css.

## 4. Commit

Commit message:

Polish admin hub and add fulfillment beta

## Beta test flow

1. Create or select a test member account.
2. Open Admin > Fulfillment Beta.
3. Create a test order.
4. Select the weapon/category sent.
5. Enter the exact skin name and exterior.
6. Enter Steam reference value and your acquisition cost.
7. Change status:
   draft > purchasing > ready to send > trade sent > accepted > fulfilled
8. Confirm the order appears as fulfilled with timestamps.

The member dashboard can read from `public.fulfillment_orders` later to display
the same live fulfillment status.
