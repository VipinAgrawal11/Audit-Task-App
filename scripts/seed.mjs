/**
 * Seed script — creates sample staff + tasks for the Audit Firm Task Manager.
 *
 * Usage:
 *   1) Run schema.sql and policies.sql in the Supabase SQL editor first.
 *   2) Set environment variables (NEVER commit the service role key):
 *        SUPABASE_URL=https://<ref>.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=<service_role key from Project Settings -> API>
 *   3) node scripts/seed.mjs
 *
 * The service role key bypasses RLS, which is exactly what a trusted seed needs.
 * It is read from the environment and never stored in the repo.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Default password for ALL sample accounts. Change after first login.
const DEFAULT_PASSWORD = 'AuditFirm@2026';

const STAFF = [
  { email: 'partner@auditfirm.test', name: 'Priya Menon (Managing Partner)', role: 'partner' },
  { email: 'manager@auditfirm.test', name: 'Rohan Das (Remote Manager)', role: 'manager' },
  { email: 'employee.a@auditfirm.test', name: 'Employee A', role: 'employee' },
  { email: 'employee.b@auditfirm.test', name: 'Employee B', role: 'employee' },
  { email: 'employee.c@auditfirm.test', name: 'Employee C', role: 'employee' },
  { email: 'employee.d@auditfirm.test', name: 'Employee D', role: 'employee' },
  { email: 'employee.e@auditfirm.test', name: 'Employee E', role: 'employee' },
];

/** Create a confirmed user, or fetch the existing one. Returns its id. */
async function ensureUser({ email, name, role }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (!error) {
    console.log(`  created ${email} (${role})`);
    return data.user.id;
  }

  // Already exists — find it by paging through the user list.
  let page = 1;
  for (;;) {
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listErr) throw listErr;
    const found = list.users.find((u) => u.email === email);
    if (found) {
      console.log(`  exists  ${email} (${role})`);
      // Make sure the profile role is correct even on re-runs.
      await admin.from('users').update({ name, role, active: true }).eq('id', found.id);
      return found.id;
    }
    if (list.users.length < 200) break;
    page += 1;
  }
  throw new Error(`Could not create or find user ${email}: ${error.message}`);
}

/** Date helper: today shifted by `days`, formatted as YYYY-MM-DD. */
const day = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

async function main() {
  console.log('Seeding staff accounts...');
  const ids = {};
  for (const person of STAFF) {
    ids[person.email] = await ensureUser(person);
  }

  const partner = ids['partner@auditfirm.test'];
  const manager = ids['manager@auditfirm.test'];
  const empA = ids['employee.a@auditfirm.test'];
  const empB = ids['employee.b@auditfirm.test'];
  const empC = ids['employee.c@auditfirm.test'];
  const empD = ids['employee.d@auditfirm.test'];
  const empE = ids['employee.e@auditfirm.test'];

  console.log('Seeding tasks...');
  const tasks = [
    { title: 'Prepare VAT reconciliation', description: 'Reconcile Q1 VAT input/output for client Alpha Traders.', assigned_by: partner, assigned_to: empA, priority: 'HIGH', start_date: day(-2), deadline: day(4), status: 'IN_PROGRESS' },
    { title: 'Draft audit engagement letter', description: 'Standard engagement letter for new client Beta Industries.', assigned_by: manager, assigned_to: empB, priority: 'MEDIUM', start_date: day(-1), deadline: day(2), status: 'NOT_STARTED' },
    { title: 'Bank confirmation follow-up', description: 'Chase outstanding bank confirmations for Gamma Ltd.', assigned_by: manager, assigned_to: empC, priority: 'HIGH', start_date: day(-5), deadline: day(-1), status: 'ON_HOLD', delay_reason: 'Waiting for client information' },
    { title: 'Fixed asset register review', description: 'Verify additions and disposals against invoices.', assigned_by: partner, assigned_to: empD, priority: 'LOW', start_date: day(-3), deadline: day(7), status: 'IN_PROGRESS' },
    { title: 'Payroll testing — sample of 25', description: 'Test payroll calculations for a sample of 25 employees.', assigned_by: manager, assigned_to: empE, priority: 'MEDIUM', start_date: day(0), deadline: day(5), status: 'NOT_STARTED' },
    { title: 'Inventory count attendance memo', description: 'Document observations from year-end stock count.', assigned_by: partner, assigned_to: empA, priority: 'MEDIUM', start_date: day(-7), deadline: day(-3), status: 'COMPLETED' },
    { title: 'Revenue cut-off testing', description: 'Test sales around year-end for correct period recognition.', assigned_by: manager, assigned_to: empB, priority: 'HIGH', start_date: day(-1), deadline: day(3), status: 'WAITING_FOR_REVIEW' },
    { title: 'Update audit working paper index', description: 'Refresh the WP index for the Delta file.', assigned_by: manager, assigned_to: empC, priority: 'LOW', start_date: day(-2), deadline: day(6), status: 'IN_PROGRESS' },
    { title: 'Related party disclosures schedule', description: 'Compile related-party transactions for disclosure notes.', assigned_by: partner, assigned_to: empD, priority: 'MEDIUM', start_date: day(1), deadline: day(9), status: 'NOT_STARTED' },
    { title: 'Management letter points draft', description: 'Summarise control weaknesses noted during fieldwork.', assigned_by: partner, assigned_to: empE, priority: 'HIGH', start_date: day(-4), deadline: day(-2), status: 'ON_HOLD', delay_reason: 'Need clarification' },
  ];

  const { data: inserted, error: taskErr } = await admin.from('tasks').insert(tasks).select('id, title, assigned_to, assigned_by');
  if (taskErr) throw taskErr;
  console.log(`  inserted ${inserted.length} tasks`);

  console.log('Seeding a few remark threads...');
  const t0 = inserted[0];
  const t6 = inserted[6];
  await admin.from('task_comments').insert([
    { task_id: t0.id, user_id: partner, comment: 'Please complete this before Friday.' },
    { task_id: t0.id, user_id: empA, comment: 'Waiting for the purchase ledger export from the client.' },
    { task_id: t6.id, user_id: manager, comment: 'Ready for my review — I will look this afternoon.' },
  ]);

  console.log('\nDone. Sample logins (password for all): ' + DEFAULT_PASSWORD);
  for (const s of STAFF) console.log(`  ${s.role.padEnd(8)} ${s.email}`);
}

main().catch((e) => {
  console.error('\nSeed failed:', e.message);
  process.exit(1);
});
