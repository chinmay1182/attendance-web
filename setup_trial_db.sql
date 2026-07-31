-- Complete Database Setup Script to create business_profiles table and support Trial Periods & Extensions.
-- Run this in your Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.business_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_name VARCHAR(255),
    logo_url TEXT,
    address_1 TEXT,
    address_2 TEXT,
    street_address TEXT,
    gst_number VARCHAR(100),
    cin_number VARCHAR(100),
    mobile VARCHAR(50),
    email VARCHAR(255),
    recovery_pin VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Trial period and extensions
    trial_start_date TIMESTAMPTZ DEFAULT NOW(),
    trial_end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    trial_extension_days INT DEFAULT 0,
    trial_extension_status VARCHAR(50) DEFAULT 'none', -- 'none', 'pending', 'approved', 'rejected'
    trial_extension_requested_at TIMESTAMPTZ,
    
    -- User information and project columns to identify which app/project this user belongs to
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    user_phone VARCHAR(50),
    project_name VARCHAR(100) DEFAULT 'attendance web'
);

-- Row Level Security (RLS) Configuration
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow individual users select access to their own profile" 
ON public.business_profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Allow individual users update access to their own profile" 
ON public.business_profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Allow individual users insert access to their own profile" 
ON public.business_profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);
