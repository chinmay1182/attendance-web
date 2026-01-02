-- ==========================================
-- COMPLETE SCHEMA SETUP FOR ATTENDANCE WEB
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Help Desk Tickets
create table if not exists tickets (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  category text check (category in ('IT Support', 'HR Query', 'Payroll Issue', 'Other')),
  description text not null,
  status text check (status in ('Open', 'In Progress', 'Resolved')) default 'Open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Shifts
create table if not exists shifts (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  date date not null,
  start_time timestamp with time zone not null, -- Changed to timestamp for easier parsing
  end_time timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tasks (Timesheets)
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  date date not null,
  title text not null,
  description text,
  hours float not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Notices
create table if not exists notices (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  type text check (type in ('Announcement', 'Event', 'Policy')) default 'Announcement',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Expenses
create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  title text not null,
  amount float not null,
  date date not null,
  status text check (status in ('Pending', 'Approved', 'Rejected')) default 'Pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Assets
create table if not exists assets (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id),
  name text not null,
  asset_code text unique not null,
  status text check (status in ('Active', 'Repair', 'Lost', 'Retired')) default 'Active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Recruitment (Candidates)
create table if not exists candidates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  role text not null,
  department text not null,
  status text check (status in ('Applied', 'Interview', 'Offer', 'Hired', 'Rejected')) default 'Applied',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Audit Logs
create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null, -- Renamed from actor_id to match code
  action text not null,
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Performance Goals
create table if not exists performance_goals (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  title text not null,
  description text,
  progress int default 0,
  year int not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Departments
create table if not exists departments (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. Sites (Geofencing)
create table if not exists sites (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  latitude float not null,
  longitude float not null,
  radius int default 100, -- Changed to match code (radius vs radius_meters)
  description text, -- Added description field used in code
  is_primary boolean default false, -- Added is_primary field used in code
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. Regularization Requests
create table if not exists regularization_requests (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  date date not null,
  clock_in timestamp with time zone,
  clock_out timestamp with time zone,
  reason text,
  status text check (status in ('Pending', 'Approved', 'Rejected')) default 'Pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. Payroll Runs
create table if not exists payroll_runs (
  id uuid default gen_random_uuid() primary key,
  month text, -- Made optional as not always passed in demo
  total_cost float not null,
  employees_count int not null,
  status text check (status in ('Draft', 'Processing', 'Completed')) default 'Draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 14. Leave Policies
create table if not exists leave_policies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  days_per_year int not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 15. Onboarding Tasks
create table if not exists onboarding_tasks (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null, -- Can be null for templates, but code uses user_id
  task text not null,
  status text check (status in ('Pending', 'Completed')) default 'Pending',
  due_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 16. Courses
create table if not exists courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  duration text,
  category text,
  thumbnail_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 17. User Courses
create table if not exists user_courses (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  course_id uuid references courses(id) not null,
  progress int default 0,
  status text check (status in ('Not Started', 'In Progress', 'Completed')) default 'Not Started',
  enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 18. Referrals
create table if not exists referrals (
  id uuid default gen_random_uuid() primary key,
  referrer_id text references users(id),
  candidate_name text not null,
  email text,
  position text,
  resume_url text,
  status text check (status in ('Pending', 'Reviewed', 'Hired', 'Rejected')) default 'Pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 19. Polls
create table if not exists polls (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  options jsonb not null,
  status text check (status in ('Active', 'Closed')) default 'Active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 20. Rewards
create table if not exists rewards (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  points int default 0,
  icon text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 21. Automation Rules
create table if not exists automation_rules (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  condition jsonb,
  action jsonb,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 22. Jobs (Recruitment)
create table if not exists jobs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  department text not null,
  applicants_count int default 0,
  description text,
  status text check (status in ('Open', 'Closed')) default 'Open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 23. Messages (Chat)
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  sender_id text references users(id) not null,
  receiver_id text not null, -- Can reference users(id) or be a group id
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES (Enable basic access for now)
alter table expenses enable row level security;
drop policy if exists "Allow all access to expenses" on expenses;
create policy "Allow all access to expenses" on expenses for all using (true) with check (true);

alter table tasks enable row level security;
drop policy if exists "Allow all access to tasks" on tasks;
create policy "Allow all access to tasks" on tasks for all using (true) with check (true);

alter table tickets enable row level security;
drop policy if exists "Allow all access to tickets" on tickets;
create policy "Allow all access to tickets" on tickets for all using (true) with check (true);

alter table jobs enable row level security;
drop policy if exists "Allow all access to jobs" on jobs;
create policy "Allow all access to jobs" on jobs for all using (true) with check (true);

alter table messages enable row level security;
drop policy if exists "Allow all access to messages" on messages;
create policy "Allow all access to messages" on messages for all using (true) with check (true);
