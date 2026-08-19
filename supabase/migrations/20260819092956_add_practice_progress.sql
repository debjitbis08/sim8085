-- Migration: Practice progress
--
-- One row per (learner, practice step). Written when a step's checks all pass.
--
-- Completion is monotonic — a step is never un-completed — so the client can
-- reconcile server and local state with a plain union and needs no timestamps
-- for conflict resolution. `completed_at` is kept for reporting only.
--
-- Anonymous learners keep progress in sessionStorage and never reach this
-- table; signing in is what buys durable, cross-device progress.

CREATE TABLE IF NOT EXISTS public.practice_progress (
    user_id      UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    -- "<problem>/<step>", e.g. "add-two-8bit-numbers/step-1". Matches the
    -- content collection id, so a renamed step orphans its rows rather than
    -- silently crediting the wrong exercise.
    step_key     TEXT        NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- The code that passed. Lets a learner resume on another device, and lets
    -- a later step seed the editor with their own working program.
    solution     TEXT,
    PRIMARY KEY (user_id, step_key)
);

-- Progress is always read as "everything for this learner".
CREATE INDEX IF NOT EXISTS idx_practice_progress_user
    ON public.practice_progress (user_id);

ALTER TABLE public.practice_progress ENABLE ROW LEVEL SECURITY;

-- RLS denies everything by default, so each verb the client uses is spelled
-- out. `(SELECT auth.uid())` rather than a bare `auth.uid()` so the planner
-- evaluates it once per statement instead of once per row.
CREATE POLICY "Users can view their own practice progress"
    ON public.practice_progress FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can record their own practice progress"
    ON public.practice_progress FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- The client upserts, which needs UPDATE as well as INSERT.
CREATE POLICY "Users can update their own practice progress"
    ON public.practice_progress FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own practice progress"
    ON public.practice_progress FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);
