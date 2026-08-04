# Random Unused Weapon Rotation

## 1. Run SQL

Open:

supabase/random-weapon-rotation.sql

Paste it into Supabase SQL Editor as a NEW query and run it.

The final result should show:

34

## 2. Replace Admin Orders Queue

Replace:

components/AdminOrdersQueue.tsx

## 3. Add CSS

Open:

admin-random-weapon-styles.css

Paste the contents at the bottom of:

app/admin/admin.module.css

## Behavior

- New test orders have Auto-pick unused weapon enabled by default.
- Each order row has a Randomize unused button.
- The system excludes categories already assigned to another valid order in
  that member's current rotation.
- Failed and cancelled orders do not consume a category.
- After all 34 categories are used, the next assignment starts a new rotation.
- Admin may still manually override the selected weapon before saving.

Commit:

Add random unused weapon rotation
