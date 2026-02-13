-- Add new columns for detailed allowances
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS daily_allowance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS travel_allowance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS medical_allowance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_allowance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS approved_amount NUMERIC,
ADD COLUMN IF NOT EXISTS admin_comments TEXT;

-- Update the status check constraint if it exists, or just ensure status column can hold 'Partial'
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_status_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_status_check CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Partial'));
