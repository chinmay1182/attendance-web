-- 1. Create users table if it doesn't exist (Critical for Foreign Keys)
create table if not exists users (
  id text primary key, -- Firebase UID
  email text not null,
  name text,
  role text check (role in ('admin', 'hr', 'employee')) default 'employee',
  photoURL text,
  phone text,
  bio text,
  shift_start time,
  shift_end time,
  department text,
  createdAt timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for users (Simplified for Firebase Auth compatibility)
alter table users enable row level security;
drop policy if exists "Allow public access to users" on users;
create policy "Allow public access to users" on users for all using (true) with check (true);

-- 2. Create attendance table
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

-- Policies (Using simplified access because Firebase Auth UID is not available in Supabase auth.uid())
drop policy if exists "Allow all access to attendance" on attendance;
create policy "Allow all access to attendance" on attendance for all using (true) with check (true);
