# Remember Me Update

The login page now includes **Remember me on this device**, enabled by default.

- Checked: Supabase stores the authenticated session in `localStorage`, so the user remains signed in after closing and reopening the browser.
- Unchecked: Supabase stores the session in `sessionStorage`, so it is limited to that browser tab/session.
- Logging out clears the active Supabase session normally.
- No SQL or environment-variable changes are required.
