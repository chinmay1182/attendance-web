-- Create notifications table for real-time notification system
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'info', 'success', 'warning', 'error'
    category TEXT, -- 'leave', 'reward', 'goal', 'attendance', 'document', 'system'
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT, -- Optional link to related page
    related_id TEXT -- Optional ID of related entity
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid()::text);

-- Policy: Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid()::text);

-- Policy: System can insert notifications for any user
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    TO authenticated
    USING (user_id = auth.uid()::text);

-- Add comment
COMMENT ON TABLE notifications IS 'Real-time notifications for users';

-- Insert sample notifications for testing
DO $$
DECLARE
    sample_user_id TEXT;
BEGIN
    -- Get first user
    SELECT id INTO sample_user_id FROM users LIMIT 1;
    
    IF sample_user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, category, action_url)
        VALUES 
            (sample_user_id, 'Welcome!', 'Welcome to the notification system', 'info', 'system', '/dashboard'),
            (sample_user_id, 'Reward Granted', 'You received 500 points!', 'success', 'reward', '/rewards'),
            (sample_user_id, 'Goal Updated', 'Your performance goal progress was updated to 75%', 'info', 'goal', '/performance')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
