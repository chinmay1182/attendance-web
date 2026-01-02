-- 17. Regularization Requests
create table regularization_requests (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  date date not null,
  clock_in timestamp with time zone,
  clock_out timestamp with time zone,
  reason text,
  status text check (status in ('Pending', 'Approved', 'Rejected')) default 'Pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 18. Payroll Runs
create table payroll_runs (
  id uuid default gen_random_uuid() primary key,
  month text not null, -- e.g., '2024-01'
  total_cost float not null,
  employees_count int not null,
  status text check (status in ('Draft', 'Processing', 'Completed')) default 'Draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 19. Leave Policies
create table leave_policies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  days_per_year int not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 20. Onboarding Tasks
create table onboarding_tasks (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  task text not null,
  status text check (status in ('Pending', 'Completed')) default 'Pending',
  due_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 21. Courses (LMS)
create table courses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  duration text, -- e.g., '2h 30m'
  category text,
  thumbnail_url text, -- valid URL
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 22. User Course Enrollments
create table user_courses (
  id uuid default gen_random_uuid() primary key,
  user_id text references users(id) not null,
  course_id uuid references courses(id) not null,
  progress int default 0, -- 0-100
  status text check (status in ('Not Started', 'In Progress', 'Completed')) default 'Not Started',
  enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 23. Referrals
create table referrals (
  id uuid default gen_random_uuid() primary key,
  referrer_id text references users(id),
  candidate_name text not null,
  email text,
  position text,
  resume_url text,
  status text check (status in ('Pending', 'Reviewed', 'Hired', 'Rejected')) default 'Pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 24. Polls
create table polls (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  options jsonb not null, -- Array of strings e.g. ["Option A", "Option B"]
  status text check (status in ('Active', 'Closed')) default 'Active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 25. Poll Votes
create table poll_votes (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references polls(id) not null,
  user_id text references users(id) not null,
  option_selected text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(poll_id, user_id) -- One vote per user per poll
);

-- 26. Rewards & Recognition
create table rewards (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  points int default 0,
  icon text, -- Emoji or URL
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 27. Automation Rules
create table automation_rules (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  condition jsonb, -- e.g. { "type": "late_arrival", "threshold": 3 }
  action jsonb, -- e.g. { "type": "deduct_leave", "amount": 0.5 }
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
