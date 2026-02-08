-- 1. Add shift details per user (if not exists)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS shift_start TEXT,
ADD COLUMN IF NOT EXISTS shift_end TEXT,
ADD COLUMN IF NOT EXISTS id_proof TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Create Shift History Table
CREATE TABLE IF NOT EXISTS public.shift_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id TEXT REFERENCES public.users(id),
    shift_start TEXT,
    shift_end TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    applied_to_count INTEGER DEFAULT 0
);

-- 3. RLS Policies
ALTER TABLE public.shift_history ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'shift_history' AND policyname = 'Admins can view shift history'
    ) THEN
        CREATE POLICY "Admins can view shift history" ON public.shift_history
            FOR SELECT TO authenticated
            USING (auth.uid()::text IN (SELECT id FROM public.users WHERE role = 'admin'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'shift_history' AND policyname = 'Admins can insert shift history'
    ) THEN
        CREATE POLICY "Admins can insert shift history" ON public.shift_history
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid()::text IN (SELECT id FROM public.users WHERE role = 'admin'));
    END IF;
END $$;
