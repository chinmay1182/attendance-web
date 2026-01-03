-- Add receipt_url connection to expenses table
alter table expenses add column if not exists receipt_url text;

-- Create storage bucket for expenses if not exists
insert into storage.buckets (id, name, public) 
values ('expenses', 'expenses', true)
on conflict (id) do nothing;

-- Allow public access to expenses bucket (simplified for demo)
create policy "Public Access" on storage.objects for all using ( bucket_id = 'expenses' );
