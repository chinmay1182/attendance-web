-- Create shift_history table to track global shift changes
CREATE TABLE IF NOT EXISTS public.shift_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id TEXT REFERENCES public.users(id),
    shift_start TEXT, -- Using TEXT for simple "09:00" format storage
    shift_end TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    applied_to_count INTEGER DEFAULT 0
);

-- Ensure users table has shift columns (already confirmed, but good to double check via IF NOT EXISTS if possible, or just ignore errors)
-- But we already saw them in JSON.

-- Enable RLS for shift_history
ALTER TABLE public.shift_history ENABLE ROW LEVEL SECURITY;

-- Allow Admins to View and Insert
DROP POLICY IF EXISTS "Admins can view shift history" ON public.shift_history;
CREATE POLICY "Admins can view shift history" ON public.shift_history
    FOR SELECT TO authenticated
    USING (auth.uid()::text IN (SELECT id FROM public.users WHERE role = 'admin'));

DROP POLICY IF EXISTS "Admins can insert shift history" ON public.shift_history;
CREATE POLICY "Admins can insert shift history" ON public.shift_history
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text IN (SELECT id FROM public.users WHERE role = 'admin'));
