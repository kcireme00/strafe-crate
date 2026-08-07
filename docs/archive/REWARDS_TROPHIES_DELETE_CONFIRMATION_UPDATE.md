# Rewards, trophies, and deletion confirmation

## Rewards and trophies

- The existing Trophy Cabinet component is inserted unchanged beneath the XP
  and loyalty panel and above the reward catalog.
- The separate Trophies navigation link is removed.
- Existing `/trophies` bookmarks redirect to `/rewards`.

## Account deletion

- Typing `DELETE` and selecting the delete button now opens a custom Strafe
  Crate confirmation modal.
- The modal explicitly states that deletion is permanent and irreversible.
- The member must select `Yes, delete forever` before the API is called.
- The browser's default confirmation dialog is no longer used.
