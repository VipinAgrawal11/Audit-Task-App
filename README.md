# Audit Firm Task Manager

An internal, real-time **task allocation, tracking and communication** app for a small
audit firm (1 Managing Partner, 1 Remote Manager, 5 Employees).

Responsive web app, installable as a **PWA**, built to run entirely on **free tiers**
(Supabase + Vercel).

---

## ✨ Features

- **Role-based access** — Partner, Manager, Employee (enforced by Postgres Row Level Security).
- **Real-time sync** — tasks, status changes, remarks and notifications update live on every device.
- **Dashboards** — firm-wide overview for staff; "today / upcoming / pending" for employees.
- **Task workflow** — create, assign, prioritise, set deadlines, track status.
- **Status flow** — Not Started → In Progress → Waiting for Review → Completed → On Hold
  (On Hold prompts for a delay reason).
- **Remarks** — threaded comment history per task.
- **Notifications** — new assignment, status change, remark received.
- **Calendar** — day / week / month deadline views.
- **Reports** — per-employee productivity with completion % and CSV export.
- **Mobile-first** — left sidebar on desktop, bottom navigation on mobile, PWA install.

## 🧱 Tech Stack

| Layer     | Choice                                              |
| --------- | --------------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS            |
| PWA       | `vite-plugin-pwa` (Workbox)                          |
| Backend   | Supabase — Auth, PostgreSQL, Realtime, Storage-ready |
| Hosting   | Vercel (free)                                       |

---

## 📂 Project Structure

```
src/
  components/      UI, layout, and task components
  contexts/        Auth, Data (shared realtime), TaskUI (modals)
  hooks/           useTasks, useUsers, useNotifications, useComments
  lib/             supabase client + utils
  pages/           Login, Dashboard, Tasks, Calendar, Reports, Notifications, Profile
  types/           shared domain types + labels
supabase/
  schema.sql       tables, enums, triggers, realtime
  policies.sql     Row Level Security
  seed.sql         optional SQL task seed
scripts/
  seed.mjs         Node seed (creates auth users + tasks)
```

---

## 🚀 Setup

### 1. Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) account (for deployment)

### 2. Create the Supabase project

1. Create a new project at [app.supabase.com](https://app.supabase.com).
2. Open **SQL Editor** and run, in order:
   1. `supabase/schema.sql`
   2. `supabase/policies.sql`
3. (Realtime is enabled automatically by `schema.sql`, which adds the tables to the
   `supabase_realtime` publication.)

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in from **Supabase → Project Settings → API**:

```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

> The `anon` key is meant to be public — Row Level Security is what protects your data.
> **Never** put the `service_role` key in a `VITE_*` variable.

### 4. Install & run

```bash
npm install
npm run dev
```

Open http://localhost:5173.

### 5. Seed sample data (1 Partner, 1 Manager, 5 Employees, 10 tasks)

**Option A — Node script (recommended, creates the login accounts too):**

```bash
# PowerShell
$env:SUPABASE_URL="https://<your-ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service_role key>"
node scripts/seed.mjs
```

```bash
# macOS/Linux
SUPABASE_URL="https://<your-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role key>" \
node scripts/seed.mjs
```

**Option B — Manual:** create the users under **Authentication → Users**, then run
`supabase/seed.sql` in the SQL editor to add the sample tasks.

**Sample logins** (password for all: `AuditFirm@2026` — change after first login):

| Role     | Email                       |
| -------- | --------------------------- |
| Partner  | partner@auditfirm.test      |
| Manager  | manager@auditfirm.test      |
| Employee | employee.a@auditfirm.test … employee.e@auditfirm.test |

---

## 👥 Adding real users

New sign-ups are auto-mirrored into `public.users` with the `employee` role (via the
`handle_new_user` trigger). To promote someone, run in the SQL editor:

```sql
update public.users set role = 'manager' where email = 'name@firm.com';
-- or 'partner'
```

You can create accounts from **Authentication → Users → Add user** (set
`email_confirm`), or let staff self-register if you enable email sign-ups.

---

## 🔐 Security model (RLS)

| Table           | Partner / Manager        | Employee                                  |
| --------------- | ------------------------ | ----------------------------------------- |
| `tasks`         | view & edit all; create  | view **only assigned**; update status/remarks only |
| `task_comments` | all visible tasks        | only on assigned tasks                    |
| `notifications` | own only                 | own only                                  |
| `activity_logs` | all                      | only for assigned tasks (read-only)       |
| `users`         | directory readable; partner manages roles | directory readable; edit own profile |

- Only **partners** can delete tasks.
- Employees are restricted to `status`, `remarks`, `delay_reason` by a guard trigger
  (RLS can't do column-level limits alone).
- Role checks use `SECURITY DEFINER` helpers (`is_staff()`, `is_partner()`) to avoid
  RLS recursion on the `users` table.

---

## ▲ Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
3. Framework preset: **Vite** (auto-detected; `vercel.json` is included).
4. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Deploy.** SPA routing and asset caching are handled by `vercel.json`.

After deploy, open the site on a phone and use the browser's **"Add to Home Screen"**
to install the PWA.

> **Supabase Auth redirect:** under **Authentication → URL Configuration**, add your
> Vercel domain to *Site URL* / *Redirect URLs*.

---

## 🧪 Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start the dev server                 |
| `npm run build`    | Type-check + production build        |
| `npm run preview`  | Preview the production build         |
| `npm run lint`     | ESLint                               |
| `npm run typecheck`| TypeScript only                      |

**Continuous integration:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs
lint + typecheck + build on every push and PR to `main`.

---

## 🗺️ Future-ready

- **Storage:** Supabase Storage is available on the free tier — add a bucket and wire
  file attachments to tasks when needed.
- **Email/push notifications:** the `notifications` table + triggers are in place;
  add a Supabase Edge Function to fan out emails or web-push.
- **Deadline reminders:** schedule a `pg_cron` job to insert "deadline approaching"
  notifications.
