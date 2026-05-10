-- This script fixes orphaned departments and sites that were created without a company_id.
-- Replace 'YOUR_COMPANY_ID_HERE' with your actual company ID (e.g., 'c26a2495-9486-4800-8e40-6660f092573c').

-- 1. Fix Departments
UPDATE public.departments 
SET company_id = 'c26a2495-9486-4800-8e40-6660f092573c' 
WHERE company_id IS NULL;

-- 2. Fix Sites (if any were orphaned)
UPDATE public.sites 
SET company_id = 'c26a2495-9486-4800-8e40-6660f092573c' 
WHERE company_id IS NULL;

-- 3. Fix Rewards (if any were orphaned)
UPDATE public.rewards 
SET company_id = 'c26a2495-9486-4800-8e40-6660f092573c' 
WHERE company_id IS NULL;
