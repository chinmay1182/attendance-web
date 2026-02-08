-- Step 1: Create leave_policies table
CREATE TABLE IF NOT EXISTS leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    days_per_year INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Insert default leave policies
INSERT INTO leave_policies (name, days_per_year, description) VALUES
('Casual Leave', 12, 'For personal matters and short-term needs'),
('Sick Leave', 10, 'For medical reasons and health issues'),
('Earned Leave', 15, 'Annual vacation leave earned over time'),
('Maternity Leave', 180, 'For expecting mothers'),
('Paternity Leave', 15, 'For new fathers')
ON CONFLICT (name) DO NOTHING;

-- Step 3: Verify the data
SELECT * FROM leave_policies;
