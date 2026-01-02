
-- 1. Drop the policy depending on the column
drop policy if exists "Users can view their own profile" on users;

-- 2. Drop foreign keys
alter table attendance drop constraint if exists attendance_user_id_fkey;
alter table leaves drop constraint if exists leaves_user_id_fkey;
alter table regularization_requests drop constraint if exists regularization_requests_user_id_fkey;

-- 3. Change columns to text
alter table users alter column id type text;
alter table attendance alter column user_id type text;
alter table leaves alter column user_id type text;
alter table regularization_requests alter column user_id type text;

-- 4. Re-add foreign keys
alter table attendance add constraint attendance_user_id_fkey foreign key (user_id) references users(id);
alter table leaves add constraint leaves_user_id_fkey foreign key (user_id) references users(id);
alter table regularization_requests add constraint regularization_requests_user_id_fkey foreign key (user_id) references users(id);

-- 5. Re-create the policy (Optional, adjusted for text)
-- create policy "Users can view their own profile" on users for select using (auth.uid()::text = id);
