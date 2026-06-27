# Supabase Setup for TradR (Real Backend + Auth)

## 1. Create Supabase Project
- Go to https://supabase.com
- Create new project
- Copy Project URL and anon key

## 2. Environment Variables
Copy `.env.example` to `.env.local` and fill:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get the service role key from Supabase → Project Settings → API (server only — never expose to the browser).

## 3. Run the Schema
In Supabase Dashboard → SQL Editor:
- **New project:** paste and run `supabase-schema.sql`
- **Existing project:** run `supabase-multiplayer-migration.sql`, then copy the `join_contest` + `execute_trade` functions from `supabase-schema.sql`

## 4. Enable Auth
In Supabase Auth settings:
- Enable Email provider
- (Optional) Add Google etc. later

## 5. Restart dev server
npm run dev

Auth will now work in the Profile tab. Deposits will be local for now but the structure is ready to sync balance to profiles table.

## Multiplayer (implemented)
- Contests load from Supabase (`GET /api/contests`)
- Join + trades are atomic via Postgres RPC (`join_contest`, `execute_trade`)
- Real leaderboard ranks all players in a contest (`GET /api/leaderboard`)
- Settlement distributes payouts server-side (`POST /api/contests/settle`)

## Next Steps
- Add real Stripe deposits
- Auto-settle contests when `ends_at` passes (cron)
- Sign in with Apple for App Store
