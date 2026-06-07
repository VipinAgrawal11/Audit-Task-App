-- =============================================================================
--  Audit Firm Task Manager — Database Schema
--  Run order: 1) schema.sql  2) policies.sql  3) seed.sql
--  Target: Supabase (PostgreSQL 15+)
-- =============================================================================

-- Required extensions ---------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid(), crypt()

-- =============================================================================
--  ENUM TYPES
-- =============================================================================
do $$ begin
  create type user_role as enum ('partner', 'manager', 'employee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum (
    'NOT_STARTED', 'IN_PROGRESS', 'WAITING_FOR_REVIEW', 'COMPLETED', 'ON_HOLD'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('HIGH', 'MEDIUM', 'LOW');
exception when duplicate_object then null; end $$;

-- =============================================================================
--  TABLE: users  (profile mirror of auth.users)
-- =============================================================================
create table if not exists public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text        not null default '',
  email      text        not null,
  role       user_role   not null default 'employee',
  active     boolean     not null default true,
  created_at timestamptz not null default now()
);

comment on table public.users is 'Firm staff. One row per auth user, created via trigger on signup.';

-- =============================================================================
--  TABLE: tasks
-- =============================================================================
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text          not null,
  description  text          not null default '',
  assigned_by  uuid          not null references public.users (id) on delete restrict,
  assigned_to  uuid          not null references public.users (id) on delete restrict,
  priority     task_priority not null default 'MEDIUM',
  start_date   date,
  deadline     date,
  status       task_status   not null default 'NOT_STARTED',
  remarks      text          not null default '',
  delay_reason text,
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);

create index if not exists idx_tasks_assigned_to on public.tasks (assigned_to);
create index if not exists idx_tasks_assigned_by on public.tasks (assigned_by);
create index if not exists idx_tasks_status      on public.tasks (status);
create index if not exists idx_tasks_deadline    on public.tasks (deadline);

-- =============================================================================
--  TABLE: task_comments  (internal remark history)
-- =============================================================================
create table if not exists public.task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid        not null references public.tasks (id) on delete cascade,
  user_id    uuid        not null references public.users (id) on delete cascade,
  comment    text        not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_task on public.task_comments (task_id, created_at);

-- =============================================================================
--  TABLE: notifications
-- =============================================================================
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references public.users (id) on delete cascade,
  message     text        not null,
  task_id     uuid        references public.tasks (id) on delete cascade,
  read_status boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, read_status, created_at desc);

-- =============================================================================
--  TABLE: activity_logs  (audit trail)
-- =============================================================================
create table if not exists public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid        references public.tasks (id) on delete cascade,
  user_id    uuid        references public.users (id) on delete set null,
  action     text        not null,
  old_value  text,
  new_value  text,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_task on public.activity_logs (task_id, created_at desc);
create index if not exists idx_activity_user on public.activity_logs (user_id, created_at desc);

-- =============================================================================
--  FUNCTION: keep tasks.updated_at fresh
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- =============================================================================
--  FUNCTION: mirror new auth users into public.users
--  Reads name/role from sign-up metadata; defaults role to 'employee'.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'employee')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
--  FUNCTION: task lifecycle -> activity log + notifications
--  SECURITY DEFINER so it can write logs/notifications regardless of caller RLS.
-- =============================================================================
create or replace function public.handle_task_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := coalesce(auth.uid(), new.assigned_by);
begin
  if tg_op = 'INSERT' then
    insert into public.activity_logs (task_id, user_id, action, new_value)
    values (new.id, actor, 'created', new.title);

    if new.assigned_to is not null and new.assigned_to <> actor then
      insert into public.notifications (user_id, message, task_id)
      values (new.assigned_to, 'New task assigned: ' || new.title, new.id);
    end if;

  elsif tg_op = 'UPDATE' then
    -- Status transitions
    if new.status is distinct from old.status then
      insert into public.activity_logs (task_id, user_id, action, old_value, new_value)
      values (new.id, actor, 'status_changed', old.status::text, new.status::text);

      -- Notify the assigner that work progressed.
      if new.assigned_by is not null and new.assigned_by <> actor then
        insert into public.notifications (user_id, message, task_id)
        values (
          new.assigned_by,
          case when new.status = 'COMPLETED'
               then 'Task completed: ' || new.title
               else 'Status updated to ' || replace(new.status::text, '_', ' ') || ': ' || new.title
          end,
          new.id
        );
      end if;
    end if;

    -- Reassignment
    if new.assigned_to is distinct from old.assigned_to then
      insert into public.activity_logs (task_id, user_id, action, old_value, new_value)
      values (new.id, actor, 'reassigned', old.assigned_to::text, new.assigned_to::text);

      if new.assigned_to is not null and new.assigned_to <> actor then
        insert into public.notifications (user_id, message, task_id)
        values (new.assigned_to, 'New task assigned: ' || new.title, new.id);
      end if;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_task_changes on public.tasks;
create trigger trg_task_changes
  after insert or update on public.tasks
  for each row execute function public.handle_task_changes();

-- =============================================================================
--  FUNCTION: comment added -> notify the other party
-- =============================================================================
create or replace function public.handle_new_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t        public.tasks%rowtype;
  recipient uuid;
begin
  select * into t from public.tasks where id = new.task_id;
  if not found then return new; end if;

  -- Notify both the assignee and assigner, except whoever wrote the comment.
  for recipient in
    select unnest(array[t.assigned_to, t.assigned_by])
  loop
    if recipient is not null and recipient <> new.user_id then
      insert into public.notifications (user_id, message, task_id)
      values (recipient, 'New remark on: ' || t.title, t.id);
    end if;
  end loop;

  return new;
end $$;

drop trigger if exists trg_new_comment on public.task_comments;
create trigger trg_new_comment
  after insert on public.task_comments
  for each row execute function public.handle_new_comment();

-- =============================================================================
--  REALTIME: broadcast row changes to subscribed clients
-- =============================================================================
do $$
begin
  -- add each table to the realtime publication if not already a member
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'task_comments'
  ) then
    alter publication supabase_realtime add table public.task_comments;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity_logs'
  ) then
    alter publication supabase_realtime add table public.activity_logs;
  end if;
end $$;
