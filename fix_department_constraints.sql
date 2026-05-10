-- This script fixes the unique constraint on the departments table.
-- Currently, it prevents different companies from having departments with the same name.
-- Run this in your Supabase SQL Editor.

-- 1. Remove the incorrect global unique constraint
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_name_key;

-- 2. Add a new constraint that is unique per company
-- This allows Company A and Company B to both have an "Engineering" department,
-- but prevents Company A from having two "Engineering" departments.
ALTER TABLE public.departments ADD CONSTRAINT departments_company_id_name_key UNIQUE (company_id, name);
