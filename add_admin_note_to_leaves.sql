ALTER TABLE public.leave_requests 
ADD COLUMN IF NOT EXISTS admin_note TEXT;
