# Threaded Support Tickets

## Member behavior

- Only one active ticket is allowed at a time.
- Active tickets open on their own thread page.
- Members can add replies and additional information.
- The Support Center displays a typical 24–48 hour response time.
- Closed, resolved, and archived tickets remain available as read-only history.
- After the active ticket is closed or resolved, the member may create another.

## Admin behavior

- Open the full ticket thread from the Tickets tab.
- Reply and set the next status in the same action.
- Close a ticket to let the member create a new one.
- Archive a ticket as locked history without marking it solved.
- Disable or restore ticket access for a specific member.

## Database

Run `supabase/2026-08-threaded-support-tickets.sql` once after deployment.
