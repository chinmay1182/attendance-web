-- This script fixes orphaned data safely without causing duplicate errors.
-- Replace 'c26a2495-9486-4800-8e40-6660f092573c' with your actual company ID if different.

-- 1. Delete orphaned departments that would cause a conflict (if they already exist for the company)
DELETE FROM public.departments
WHERE company_id IS NULL
AND name IN (
    SELECT name FROM public.departments WHERE company_id = 'c26a2495-9486-4800-8e40-6660f092573c'
);

-- 2. Update remaining orphaned departments
UPDATE public.departments 
SET company_id = 'c26a2495-9486-4800-8e40-6660f092573c' 
WHERE company_id IS NULL;

-- 3. Delete orphaned sites that would cause a conflict
DELETE FROM public.sites
WHERE company_id IS NULL
AND name IN (
    SELECT name FROM public.sites WHERE company_id = 'c26a2495-9486-4800-8e40-6660f092573c'
);

-- 4. Update remaining orphaned sites
UPDATE public.sites 
SET company_id = 'c26a2495-9486-4800-8e40-6660f092573c' 
WHERE company_id IS NULL;
