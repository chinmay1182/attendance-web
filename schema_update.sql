
-- 4. Holidays Table
create table holidays (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Regularization Requests
create table regularization_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) not null,
  date date not null,
  clock_in timestamp with time zone,
  clock_out timestamp with time zone,
  reason text,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  admin_note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Update Users Table for Shifts and Profile
alter table users add column if not exists shift_start time;
alter table users add column if not exists shift_end time;
alter table users add column if not exists department text;
alter table users add column if not exists phone text;
alter table users add column if not exists bio text;

-- Settings Table for Geofencing/IP
create table settings (
  key text primary key,
  value jsonb
);
-- Example: key='general', value='{"office_lat": 12.9716, "office_lng": 77.5946, "radius_meters": 100, "allowed_ips": []}'
