-- Simple script to insert leave policies (works even if table exists)

-- Clear existing data (optional - remove if you want to keep existing data)
-- DELETE FROM leave_policies;

-- Insert default leave policies
INSERT INTO leave_policies (name, days_per_year, description) VALUES
('Casual Leave', 12, 'For personal matters and short-term needs'),
('Sick Leave', 10, 'For medical reasons and health issues'),
('Earned Leave', 15, 'Annual vacation leave earned over time'),
('Maternity Leave', 180, 'For expecting mothers'),
('Paternity Leave', 15, 'For new fathers');

-- Verify the data
SELECT * FROM leave_policies;
