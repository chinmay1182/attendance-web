-- This script adds the missing company_id column to the rewards table.
-- Run this in your Supabase SQL Editor.

ALTER TABLE public.rewards 
ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Optional: If you want to make rewards unique per company
-- ALTER TABLE public.rewards ADD CONSTRAINT rewards_company_id_title_key UNIQUE (company_id, title);
