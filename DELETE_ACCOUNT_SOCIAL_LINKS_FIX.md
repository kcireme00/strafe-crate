# Account deletion and social links fix

## Account deletion

- Removed references to optional profile/subscription columns that could cause
  deletion to fail when the deployed schema differs.
- Stripe cancellation happens before Supabase Auth deletion.
- Optional chat/local-record updates no longer block deletion.
- The API now returns the exact stage and database/API message when something
  fails, instead of only "Unable to delete the account."

## Social links

The footer now contains icon-only links for:

- Discord
- X
- Instagram

The visible platform names are omitted. Accessible labels and hover titles
remain for screen readers and usability.
