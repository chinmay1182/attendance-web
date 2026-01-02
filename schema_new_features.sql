-- 6. Tickets Table (Help Desk)
create table tickets (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  category text check (category in ('IT Support', 'HR Query', 'Payroll Issue', 'Other')),
  description text not null,
  status text check (status in ('Open', 'In Progress', 'Resolved')) default 'Open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Shifts Table
create table shifts (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Tasks Table (Timesheets)
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  date date not null,
  title text not null,
  description text,
  hours float not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Notices Table
create table notices (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  type text check (type in ('Announcement', 'Event', 'Policy')) default 'Announcement',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Expenses Table
create table expenses (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  title text not null,
  amount float not null,
  date date not null,
  status text check (status in ('Pending', 'Approved', 'Rejected')) default 'Pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. Assets Table
create table assets (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id), -- Can be null if unassigned
  name text not null,
  asset_code text unique not null,
  status text check (status in ('Active', 'Repair', 'Lost', 'Retired')) default 'Active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 12. Recruitment Table (Candidates)
create table candidates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  role text not null,
  department text not null,
  status text check (status in ('Applied', 'Interview', 'Offer', 'Hired', 'Rejected')) default 'Applied',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 13. Audit Logs Table
create table audit_logs (
  id uuid default gen_random_uuid() primary key,
  actor_id text references users(id) not null,
  action text not null,
  details text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 14. Performance Goals (KPIs)
create table performance_goals (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  title text not null,
  description text,
  progress int default 0, -- 0 to 100
  year int not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 15. Departments Table
create table departments (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 16. Geofencing Sites
create table sites (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  latitude float not null,
  longitude float not null,
  radius_meters int default 100,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
