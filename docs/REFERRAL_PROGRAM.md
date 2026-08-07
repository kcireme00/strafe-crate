# Referral Program

## Reward

The referral-code owner earns **5 Supply Credits** when a referred account activates a membership.

The reward does **not** wait for the first paid monthly cycle. In the current Stripe setup, a successful Checkout creates a `trialing` subscription until the first-of-month charge, and that counts as membership activation.

## Attribution

1. A member creates a customizable code at `/referrals`.
2. They share `https://strafecrate.com/?ref=CODE`.
3. The browser preserves the code.
4. The code is written into Supabase Auth metadata when the new account is created.
5. After email verification/login, the account is securely attributed to that code.
6. On successful Stripe membership activation, the referrer receives 5 Supply Credits.

An existing account cannot click a referral URL later and retroactively become a referral because the database verifies that the referral code was part of that user's signup metadata.

Each referred account can award credits only once, even if it cancels and resubscribes.

## Sand Dune event hotfix

The same SQL migration also fixes the `column reference "trophy_id" is ambiguous` error in the Sand Dune event approval function.
