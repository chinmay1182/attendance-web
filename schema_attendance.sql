-- Create attendance table
create table if not exists attendance (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  date date not null,
  clock_in timestamp with time zone,
  clock_out timestamp with time zone,
  status text check (status in ('present', 'absent', 'half-day')) default 'absent',
  location_in jsonb,
  location_out jsonb,
  total_hours float default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table attendance enable row level security;

-- Policies
drop policy if exists "Enable read access for own attendance" on attendance;
create policy "Enable read access for own attendance" on attendance for select using (auth.uid()::text = user_id);

drop policy if exists "Enable insert access for own attendance" on attendance;
create policy "Enable insert access for own attendance" on attendance for insert with check (auth.uid()::text = user_id);

drop policy if exists "Enable update access for own attendance" on attendance;
create policy "Enable update access for own attendance" on attendance for update using (auth.uid()::text = user_id);
