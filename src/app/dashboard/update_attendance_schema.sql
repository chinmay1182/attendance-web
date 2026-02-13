-- Add columns to attendance table to track site context and approval status
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id),
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Approved',
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Ensure status check constraint covers the needed states
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_approval_status_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_approval_status_check CHECK (approval_status IN ('Approved', 'Pending', 'Rejected'));

-- Index for faster filtering of pending records
CREATE INDEX IF NOT EXISTS idx_attendance_approval_status ON attendance(approval_status);
