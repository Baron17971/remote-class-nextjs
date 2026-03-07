<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ec6e42bf-5128-44f5-9cca-e15391489cce

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `NEXT_PUBLIC_GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in [.env.local](.env.local)
3. Run the app:
   `npm run dev`

## Supabase Setup (Correct Structure)

This repo now includes a real Supabase project structure:

- `supabase/config.toml`
- `supabase/migrations/20260307143000_init_plans.sql`

Apply migration to your remote project with Supabase CLI:

1. `supabase login`
2. `supabase link --project-ref <your-project-ref>`
3. `supabase db push`

Notes:

- Data access in the app is now done via direct Supabase REST endpoints (`fetch`) from `app/lib/supabaseRest.ts`.
- The app no longer uses `@supabase/supabase-js`.
