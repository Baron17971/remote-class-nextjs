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
2. Set `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in [.env.local](.env.local)
3. Authenticate to Google Cloud for Vertex AI (for local dev), for example:
   `gcloud auth application-default login`
4. Run the app:
   `npm run dev`

For full step-by-step setup on a new machine, see [`LOCAL_VERTEX_AI_SETUP.md`](LOCAL_VERTEX_AI_SETUP.md).

## Vertex AI Authentication

This app now uses Vertex AI only (server-side). No Gemini Developer API key is required.

- Local development: uses Google Application Default Credentials (ADC) automatically.
- Vercel preview/production: uses Vercel OIDC + Google Workload Identity Federation.

Required Vercel environment variables:

- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_GENAI_USE_VERTEXAI=true`
- `GCP_PROJECT_ID`
- `GCP_PROJECT_NUMBER`
- `GCP_SERVICE_ACCOUNT_EMAIL`
- `GCP_WORKLOAD_IDENTITY_POOL_ID`
- `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID`

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
