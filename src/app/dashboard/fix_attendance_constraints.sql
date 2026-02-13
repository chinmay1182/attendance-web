-- 1. Fix any inconsistent casing in the status column
UPDATE attendance SET status = LOWER(status);

-- 2. Drop the existing restrictive constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;

-- 3. Re-create the constraint strictly allowing the lowercase values we use in code
ALTER TABLE attendance ADD CONSTRAINT attendance_status_check 
CHECK (status IN ('present', 'absent', 'half-day', 'late'));

-- 4. Verify/Fix the approval_status constraint as well
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_approval_status_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_approval_status_check 
CHECK (approval_status IN ('Approved', 'Pending', 'Rejected'));

-- 5. Optional: Create index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
