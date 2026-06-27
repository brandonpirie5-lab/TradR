-- TradR Pit: run this ONCE in Supabase SQL Editor (all migrations combined)
-- Safe to re-run (uses IF NOT EXISTS / conditional inserts)

\i supabase-phase2-migration.sql
-- If \i fails in SQL Editor, paste each file manually in order:
-- 1) supabase-rebrand-contests.sql
-- 2) supabase-settlement-snapshot.sql  
-- 3) supabase-phase2-migration.sql
-- 4) supabase-pit-feed-rls.sql