-- Migration: Explicit Data API grants for practice_progress
--
-- practice_progress was created relying on Supabase's automatic grants for new
-- public tables. Supabase stops granting those on 2026-10-30, after which a
-- fresh `db reset` or preview branch would leave the table unreachable. GRANT
-- is idempotent, so this is a no-op where the grants already exist.
--
-- anon gets nothing: anonymous learners never reach this table.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_progress TO service_role;
