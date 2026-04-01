-- Company-level data isolation hardening for Supabase/Postgres.
-- Run this in the Supabase SQL editor after reviewing on staging first.

begin;

create or replace function public.current_user_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.users
  where id = auth.uid()::text
  limit 1
$$;

revoke all on function public.current_user_company_id() from public;
grant execute on function public.current_user_company_id() to authenticated;

alter table if exists public.users enable row level security;
drop policy if exists "users_same_company_select" on public.users;
create policy "users_same_company_select"
on public.users
for select
to authenticated
using (
  company_id = public.current_user_company_id()
);

drop policy if exists "users_self_update" on public.users;
create policy "users_self_update"
on public.users
for update
to authenticated
using (id = auth.uid()::text)
with check (id = auth.uid()::text);

alter table if exists public.companies enable row level security;
drop policy if exists "companies_own_company_select" on public.companies;
create policy "companies_own_company_select"
on public.companies
for select
to authenticated
using (
  id = public.current_user_company_id()
);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'attendance'
  ) then
    execute 'alter table public.attendance enable row level security';
    execute 'drop policy if exists "attendance_same_company_select" on public.attendance';
    execute $sql$
      create policy "attendance_same_company_select"
      on public.attendance
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = attendance.user_id
            and u.company_id = public.current_user_company_id()
        )
      )
    $sql$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'leave_requests'
  ) then
    execute 'alter table public.leave_requests enable row level security';
    execute 'drop policy if exists "leave_requests_same_company_select" on public.leave_requests';
    execute $sql$
      create policy "leave_requests_same_company_select"
      on public.leave_requests
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = leave_requests.user_id
            and u.company_id = public.current_user_company_id()
        )
      )
    $sql$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'site_assignments'
  ) then
    execute 'alter table public.site_assignments enable row level security';
    execute 'drop policy if exists "site_assignments_same_company_select" on public.site_assignments';
    execute $sql$
      create policy "site_assignments_same_company_select"
      on public.site_assignments
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = site_assignments.user_id
            and u.company_id = public.current_user_company_id()
        )
      )
    $sql$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'expenses'
  ) then
    execute 'alter table public.expenses enable row level security';
    execute 'drop policy if exists "expenses_same_company_select" on public.expenses';
    execute $sql$
      create policy "expenses_same_company_select"
      on public.expenses
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = expenses.user_id
            and u.company_id = public.current_user_company_id()
        )
      )
    $sql$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'tickets'
  ) then
    execute 'alter table public.tickets enable row level security';
    execute 'drop policy if exists "tickets_same_company_select" on public.tickets';
    execute $sql$
      create policy "tickets_same_company_select"
      on public.tickets
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.users u
          where u.id = tickets.user_id
            and u.company_id = public.current_user_company_id()
        )
      )
    $sql$;
  end if;
end $$;

commit;
