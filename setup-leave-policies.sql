-- Create leave_policies table if it doesn't exist
CREATE TABLE IF NOT EXISTS leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    days_per_year INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default leave policies if they don't exist
INSERT INTO leave_policies (name, days_per_year, description)
SELECT 'Casual Leave', 12, 'For personal matters and short-term needs'
WHERE NOT EXISTS (SELECT 1 FROM leave_policies WHERE name = 'Casual Leave');

INSERT INTO leave_policies (name, days_per_year, description)
SELECT 'Sick Leave', 10, 'For medical reasons and health issues'
WHERE NOT EXISTS (SELECT 1 FROM leave_policies WHERE name = 'Sick Leave');

INSERT INTO leave_policies (name, days_per_year, description)
SELECT 'Earned Leave', 15, 'Annual vacation leave earned over time'
WHERE NOT EXISTS (SELECT 1 FROM leave_policies WHERE name = 'Earned Leave');

INSERT INTO leave_policies (name, days_per_year, description)
SELECT 'Maternity Leave', 180, 'For expecting mothers'
WHERE NOT EXISTS (SELECT 1 FROM leave_policies WHERE name = 'Maternity Leave');

INSERT INTO leave_policies (name, days_per_year, description)
SELECT 'Paternity Leave', 15, 'For new fathers'
WHERE NOT EXISTS (SELECT 1 FROM leave_policies WHERE name = 'Paternity Leave');

-- Enable Realtime for leave_requests table (if not already enabled)
-- Note: This needs to be run in Supabase Dashboard under Database > Replication
-- ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
