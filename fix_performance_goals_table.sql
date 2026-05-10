-- This script ensures the performance_goals table has the correct structure.
-- Run this in your Supabase SQL Editor if you are getting "400 Bad Request".

CREATE TABLE IF NOT EXISTS public.performance_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL, -- The code uses "title" in the insert call
  progress integer DEFAULT 0,
  target integer DEFAULT 100,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT performance_goals_pkey PRIMARY KEY (id)
);

-- Note: If your table already exists but has a column named "goal" instead of "title",
-- you can rename it using:
-- ALTER TABLE public.performance_goals RENAME COLUMN goal TO title;
