# Supabase RPC Type Fix

Replace these two files in your GitHub repository:

- components/LiveChat.tsx
- components/RewardsDashboard.tsx

Then commit and push.

Suggested commit message:
Fix loyalty RPC TypeScript errors

This fixes Supabase inferring RPC arguments as `undefined` because generated database types are not installed yet.
