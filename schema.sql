
-- 1. Users Table (Publicly readable for auth checks, or restricted w/ RLS)
create table users (
  id uuid primary key, -- matches firebase uid
  email text not null,
  name text,
  role text check (role in ('admin', 'hr', 'employee')),
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Attendance Table
create table attendance (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) not null,
  date date not null,
  clock_in timestamp with time zone,
  clock_out timestamp with time zone,
  break_start timestamp with time zone,
  break_end timestamp with time zone,
  status text check (status in ('present', 'absent', 'half-day')),
  location_in jsonb, -- {lat: 123, lng: 456}
  location_out jsonb,
  total_hours float,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Leave Requests Table
create table leaves (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) not null,
  type text check (type in ('sick', 'casual', 'paid')),
  start_date date not null,
  end_date date not null,
  reason text,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  admin_note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Optional: Enable RLS (Row Level Security)
alter table users enable row level security;
alter table attendance enable row level security;
alter table leaves enable row level security;

-- Policies (Basic examples - refine as needed)
-- Allow users to see their own data
create policy "Users can view their own profile" on users for select using (auth.uid()::text = id::text); -- Warning: Firebase UID logic might differ if not using Supabase Auth. 
-- Since we use Firebase Auth, Supabase RLS won't work out of the box with `auth.uid()` unless we use Custom Claims or a wrapper. 
-- FOR THIS PROTOTYPE with shared keys, we might keep RLS off or use open policies for now, OR rely on client-side filtering (less secure).
-- Recommending turning RLS OFF for the 'anon' key usage initially for this quick prototype unless we setup JWT syncing.
