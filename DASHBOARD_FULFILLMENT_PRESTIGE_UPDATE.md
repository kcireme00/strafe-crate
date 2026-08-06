# Dashboard Fulfillment and Prestige Update

## Current cycle

The dashboard uses the fulfillment order billing cycle. In August 2026, an
August cycle displays as `August 2026 drop`.

## Fulfillment status shown to members

Only statuses the platform can reliably know are displayed:

1. Payment received
   - Automatically becomes complete when Stripe creates the paid-cycle order.

2. Trade sent
   - Becomes complete when Admin changes the order status to `trade_sent`.
   - Later statuses such as accepted/completed/fulfilled also keep it complete.

The site no longer claims to know:

- Weapon assigned
- Skin purchased
- Trade accepted

Those can remain internal Admin workflow fields without being shown as verified
member-facing milestones.

## Prestige placement

- Prestige was removed from the loose dashboard side-metric stack.
- Prestige is now shown at the right side of Weapon Rotation.
- Prestige level is also displayed on the interactive player card.
