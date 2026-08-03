# Clean Admin Orders Queue

Replace/add:

- app/admin/page.tsx
- app/admin/admin.module.css
- components/AdminOrdersQueue.tsx

This package uses a CSS module, so you do NOT need to paste anything into
globals.css.

The Orders tab is now the default admin view.

Every fulfillment order appears as a single editable line with:

- member and billing cycle
- tier
- weapon/category
- skin name
- exterior
- Steam reference value
- acquisition cost
- calculated spread
- trade ID
- status
- Save button

The existing SQL functions are used:

- get_admin_fulfillment_orders()
- get_admin_member_directory()

No new SQL is required for this UI-only update.

Commit message:

Replace admin hub with clean orders queue
