-- =============================================================================
--  Audit Firm Task Manager — Row Level Security
--  Run AFTER schema.sql.
--
--  Access model:
--    partner  -> full visibility, full control
--    manager  -> full visibility, assign / monitor / review / remark
--    employee -> only tasks assigned to them; may update status & remarks only
-- =============================================================================

-- -----------------------------------------------------------------------------
--  Helper functions (SECURITY DEFINER avoids RLS recursion on public.users).
--  We read the caller's role WITHOUT re-triggering the users table policies.
-- -----------------------------------------------------------------------------
create or replace function public.my_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role in ('partner', 'manager') from public.users where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_partner()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'partner' from public.users where id = auth.uid()),
    false
  );
$$;

-- -----------------------------------------------------------------------------
--  Enable RLS on every table.
-- -----------------------------------------------------------------------------
alter table public.users         enable row level security;
alter table public.tasks         enable row level security;
alter table public.task_comments enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

-- =============================================================================
--  users
-- =============================================================================
-- Every authenticated staff member can read the internal directory
-- (needed to render assigner/assignee names).
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated
  using (true);

-- A user may update their own profile basics; partners may update anyone.
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid() or public.is_partner())
  with check (id = auth.uid() or public.is_partner());

-- Only partners may onboard/deactivate accounts directly.
drop policy if exists users_insert_partner on public.users;
create policy users_insert_partner on public.users
  for insert to authenticated
  with check (public.is_partner());

-- =============================================================================
--  tasks
-- =============================================================================
-- Staff see all tasks; employees see only their own assignments.
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (public.is_staff() or assigned_to = auth.uid());

-- Only partners/managers create tasks, and must record themselves as assigner.
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (public.is_staff() and assigned_by = auth.uid());

-- Staff may edit any task; employees may edit only their own assignments.
-- Column-level limits for employees are enforced by the trigger below.
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_staff() or assigned_to = auth.uid())
  with check (public.is_staff() or assigned_to = auth.uid());

-- Only partners may delete tasks.
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete to authenticated
  using (public.is_partner());

-- Restrict which columns an employee may change on their own task.
-- (RLS can't do column-level checks, so we use a guard trigger.)
create or replace function public.guard_task_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() then
    return new;  -- partners & managers: unrestricted
  end if;

  -- Employees: only status / remarks / delay_reason / updated_at may change.
  if new.title       is distinct from old.title
     or new.description is distinct from old.description
     or new.assigned_by is distinct from old.assigned_by
     or new.assigned_to is distinct from old.assigned_to
     or new.priority    is distinct from old.priority
     or new.start_date  is distinct from old.start_date
     or new.deadline    is distinct from old.deadline
  then
    raise exception 'Employees may only update status, remarks and delay reason.';
  end if;

  return new;
end $$;

drop trigger if exists trg_guard_task_update on public.tasks;
create trigger trg_guard_task_update
  before update on public.tasks
  for each row execute function public.guard_task_update();

-- =============================================================================
--  task_comments
-- =============================================================================
-- Visible if the caller can see the parent task.
drop policy if exists comments_select on public.task_comments;
create policy comments_select on public.task_comments
  for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_comments.task_id
        and (public.is_staff() or t.assigned_to = auth.uid())
    )
  );

-- Caller may comment as themselves on tasks they can see.
drop policy if exists comments_insert on public.task_comments;
create policy comments_insert on public.task_comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_comments.task_id
        and (public.is_staff() or t.assigned_to = auth.uid())
    )
  );

-- Authors may delete their own comments.
drop policy if exists comments_delete on public.task_comments;
create policy comments_delete on public.task_comments
  for delete to authenticated
  using (user_id = auth.uid());

-- =============================================================================
--  notifications  (each user sees and manages only their own)
-- =============================================================================
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

-- Marking read / dismissing — own rows only.
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

-- NOTE: rows are created by SECURITY DEFINER triggers, so no INSERT policy
-- is granted to clients (direct inserts are denied by default).

-- =============================================================================
--  activity_logs  (read-only audit trail for clients)
-- =============================================================================
drop policy if exists activity_select on public.activity_logs;
create policy activity_select on public.activity_logs
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.tasks t
      where t.id = activity_logs.task_id
        and t.assigned_to = auth.uid()
    )
  );

-- Written only by SECURITY DEFINER triggers — no client INSERT policy.
