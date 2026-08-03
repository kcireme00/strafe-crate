# Subtle Chat Profile Popover

Replace:
- components/LiveChat.tsx
- components/PublicPlayerCard.tsx
- app/globals.css

Commit:
Make chat player cards subtle popovers

Behavior:
- Click username or avatar
- Small player card opens beside the clicked name
- No full-screen blur or centered modal
- Click anywhere outside or press Escape to close
- On mobile it becomes a compact bottom card
