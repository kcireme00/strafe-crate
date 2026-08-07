# Support compile fix

The new support tables are not yet present in the project's generated
Supabase TypeScript schema, causing `.from("support_tickets")` and
`.from("private_reviews")` to infer `never`.

The three new support components now use a narrow `as any` cast on the
Supabase client until database types are regenerated. This does not change
runtime permissions or Row Level Security.
