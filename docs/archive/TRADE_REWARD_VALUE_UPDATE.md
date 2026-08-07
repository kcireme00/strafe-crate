# Trade URL + Reward Fulfillment + Membership Value Update

Run `supabase/trade-url-reward-fulfillment-value.sql` after deploying.

- Only Steam trade URL is required.
- Settings links to http://steamcommunity.com/my/tradeoffers/privacy
- Reward redemptions create standalone fulfillment rows marked Reward.
- Admin uses Membership value minus Cost for order profit.
- Reward rows default to $0 membership value and therefore count their cost as a loyalty expense.
