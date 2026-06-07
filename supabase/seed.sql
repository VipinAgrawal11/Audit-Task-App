-- =============================================================================
--  Sample TASK data (optional, SQL-only fallback).
--
--  Use this only if you created the staff accounts manually in the Supabase
--  Dashboard (Authentication -> Users) instead of running scripts/seed.mjs.
--  It looks up users by email and inserts 10 sample tasks + a couple remarks.
--
--  Expected accounts (create them first with these emails):
--    partner@auditfirm.test, manager@auditfirm.test,
--    employee.a@auditfirm.test ... employee.e@auditfirm.test
--
--  Safe to skip entirely if you used the Node seed script.
-- =============================================================================

-- Make sure roles are set correctly on the manually-created profiles.
update public.users set role = 'partner'  where email = 'partner@auditfirm.test';
update public.users set role = 'manager'  where email = 'manager@auditfirm.test';
update public.users set role = 'employee' where email like 'employee.%@auditfirm.test';

do $$
declare
  partner uuid; manager uuid;
  a uuid; b uuid; c uuid; d uuid; e uuid;
begin
  select id into partner from public.users where email = 'partner@auditfirm.test';
  select id into manager from public.users where email = 'manager@auditfirm.test';
  select id into a from public.users where email = 'employee.a@auditfirm.test';
  select id into b from public.users where email = 'employee.b@auditfirm.test';
  select id into c from public.users where email = 'employee.c@auditfirm.test';
  select id into d from public.users where email = 'employee.d@auditfirm.test';
  select id into e from public.users where email = 'employee.e@auditfirm.test';

  if partner is null or manager is null or a is null then
    raise notice 'Staff accounts not found — create the auth users first. Skipping seed.';
    return;
  end if;

  -- Avoid duplicate seeding.
  if exists (select 1 from public.tasks limit 1) then
    raise notice 'Tasks already exist — skipping seed.';
    return;
  end if;

  insert into public.tasks
    (title, description, assigned_by, assigned_to, priority, start_date, deadline, status, delay_reason)
  values
    ('Prepare VAT reconciliation', 'Reconcile Q1 VAT input/output for client Alpha Traders.', partner, a, 'HIGH', current_date - 2, current_date + 4, 'IN_PROGRESS', null),
    ('Draft audit engagement letter', 'Standard engagement letter for new client Beta Industries.', manager, b, 'MEDIUM', current_date - 1, current_date + 2, 'NOT_STARTED', null),
    ('Bank confirmation follow-up', 'Chase outstanding bank confirmations for Gamma Ltd.', manager, c, 'HIGH', current_date - 5, current_date - 1, 'ON_HOLD', 'Waiting for client information'),
    ('Fixed asset register review', 'Verify additions and disposals against invoices.', partner, d, 'LOW', current_date - 3, current_date + 7, 'IN_PROGRESS', null),
    ('Payroll testing — sample of 25', 'Test payroll calculations for a sample of 25 employees.', manager, e, 'MEDIUM', current_date, current_date + 5, 'NOT_STARTED', null),
    ('Inventory count attendance memo', 'Document observations from year-end stock count.', partner, a, 'MEDIUM', current_date - 7, current_date - 3, 'COMPLETED', null),
    ('Revenue cut-off testing', 'Test sales around year-end for correct period recognition.', manager, b, 'HIGH', current_date - 1, current_date + 3, 'WAITING_FOR_REVIEW', null),
    ('Update audit working paper index', 'Refresh the WP index for the Delta file.', manager, c, 'LOW', current_date - 2, current_date + 6, 'IN_PROGRESS', null),
    ('Related party disclosures schedule', 'Compile related-party transactions for disclosure notes.', partner, d, 'MEDIUM', current_date + 1, current_date + 9, 'NOT_STARTED', null),
    ('Management letter points draft', 'Summarise control weaknesses noted during fieldwork.', partner, e, 'HIGH', current_date - 4, current_date - 2, 'ON_HOLD', 'Need clarification');

  -- A couple of sample remark threads.
  insert into public.task_comments (task_id, user_id, comment)
  select t.id, partner, 'Please complete this before Friday.'
  from public.tasks t where t.title = 'Prepare VAT reconciliation';

  insert into public.task_comments (task_id, user_id, comment)
  select t.id, a, 'Waiting for the purchase ledger export from the client.'
  from public.tasks t where t.title = 'Prepare VAT reconciliation';

  raise notice 'Seeded 10 sample tasks.';
end $$;
