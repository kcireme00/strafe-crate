# Strafe Crate Policy + Progression Update

This update restores and expands the policy system and changes the permanent
XP loyalty multiplier to a maximum of 1.25x after 12 paid months.

## Run the SQL first

Open:

supabase/xp-multiplier-125.sql

Paste it into Supabase > SQL Editor > New Query and run it.

The permanent XP schedule becomes:

- Months 1-2: 1.00x
- Months 3-5: 1.05x
- Months 6-8: 1.10x
- Months 9-11: 1.15x
- Month 12+: 1.25x

Supply Credits remain unchanged and are never multiplied.

Temporary admin events may later use a separate 2x XP event rate without
changing the member's permanent multiplier or Supply Credits.

## Replace the website files

Copy the `app` and `components` folders into:

Documents\GitHub\strafe-crate

Choose Replace files in the destination.

This includes:

- restored premium footer
- Membership and Value Policy
- Billing and Cancellation
- Refunds and Fulfillment
- Upgrade Policy
- Terms of Service
- Privacy Policy
- FAQ
- Contact
- new XP and Rewards Policy
- new Community Guidelines
- updated LoyaltyPanel text and multiplier cap
- latest chat/profile styling preserved in globals.css

## Commit

Commit message:

Restore policies and update collector progression

Then Push origin.

## Important

These policy pages are a practical operating draft, not a guarantee that the
business complies with every law in every jurisdiction. Before accepting public
payments, replace the contact placeholder and obtain legal review appropriate
to the locations where the service will operate.
