# rampa

Accessible route planner for Kraków. Residents report obstacles, and routes avoid them.

## Run locally

1. `npm install`
2. `cp .env.example .env` and fill in the keys (ORS key from openrouteservice.org, Supabase URL and anon key from the team).
   The Supabase URL is the bare project address, for example `https://xxxx.supabase.co` (no `/rest/v1/`).
3. `npm run dev`

## Database

Run `supabase/schema.sql` once in the Supabase SQL editor. It creates the `reports` table, realtime, and the `report-photos` bucket.
