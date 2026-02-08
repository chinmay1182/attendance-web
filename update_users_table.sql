-- Add ID Proof and Address columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS id_proof TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name IN ('id_proof', 'address', 'phone', 'bio');
