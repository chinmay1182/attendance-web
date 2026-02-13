-- EMERGENCY FIX: Drop the constraints that are blocking the checkout
-- Run this in the Supabase SQL Editor to immediately resolve the issue.

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_approval_status_check;
