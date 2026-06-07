import { useMemo } from 'react';
import { ListTodo, Clock, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTasksData, useUsersData } from '@/contexts/DataContext';
import { useTaskUI } from '@/contexts/TaskUIContext';
import { StatCard, EmptyState, Spinner, Avatar } from '@/components/ui/Misc';
import { TaskCard } from '@/components/tasks/TaskCard';
import { isDelayed, isDueToday, daysUntilDeadline } from '@/lib/utils';
import type { Task } from '@/types';

export function Dashboard() {
  const { profile } = useAuth();
  const { tasks, loading } = useTasksData();
  const { employees, byId } = useUsersData();
  const { openTask, openCreate, canCreate } = useTaskUI();

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const delayed = tasks.filter(isDelayed).length;
    const pending = tasks.filter((t) => t.status !== 'COMPLETED').length;
    return { total, completed, delayed, pending };
  }, [tasks]);

  // Workload: open tasks per employee.
  const workload = useMemo(() => {
    return employees
      .map((e) => ({
        user: e,
        open: tasks.filter((t) => t.assigned_to === e.id && t.status !== 'COMPLETED').length,
        delayed: tasks.filter((t) => t.assigned_to === e.id && isDelayed(t)).length,
      }))
      .sort((a, b) => b.open - a.open);
  }, [employees, tasks]);

  if (!profile) return null;
  const isStaff = profile.role === 'partner' || profile.role === 'manager';

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">
            Welcome, {profile.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-navy-400">
            {isStaff ? 'Firm-wide overview' : "Here's your workload"}
          </p>
        </div>
        {canCreate && (
          <button className="btn-gold" onClick={openCreate}>
            <Plus size={18} /> New Task
          </button>
        )}
      </div>

      {isStaff ? (
        <StaffDashboard
          stats={stats}
          workload={workload}
          tasks={tasks}
          onOpen={openTask}
          nameOf={(id) => byId.get(id)?.name ?? 'Unknown'}
        />
      ) : (
        <EmployeeDashboard
          tasks={tasks}
          onOpen={openTask}
          nameOf={(id) => byId.get(id)?.name ?? 'Unknown'}
        />
      )}
    </div>
  );
}

function StaffDashboard({
  stats,
  workload,
  tasks,
  onOpen,
  nameOf,
}: {
  stats: { total: number; pending: number; completed: number; delayed: number };
  workload: { user: { id: string; name: string }; open: number; delayed: number }[];
  tasks: Task[];
  onOpen: (t: Task) => void;
  nameOf: (id: string) => string;
}) {
  const recent = tasks.slice(0, 4);
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Tasks" value={stats.total} icon={<ListTodo size={20} />} />
        <StatCard
          label="Pending"
          value={stats.pending}
          accent="bg-blue-100 text-blue-700"
          icon={<Clock size={20} />}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          accent="bg-green-100 text-green-700"
          icon={<CheckCircle2 size={20} />}
        />
        <StatCard
          label="Delayed"
          value={stats.delayed}
          accent="bg-red-100 text-red-700"
          icon={<AlertTriangle size={20} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-bold text-navy-800">Employee Workload</h2>
          <div className="card divide-y divide-navy-100">
            {workload.length === 0 ? (
              <p className="p-4 text-sm text-navy-400">No employees yet.</p>
            ) : (
              workload.map(({ user, open, delayed }) => (
                <div key={user.id} className="flex items-center gap-3 p-3">
                  <Avatar name={user.name} size={34} />
                  <span className="flex-1 text-sm font-medium text-navy-700">{user.name}</span>
                  {delayed > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      {delayed} delayed
                    </span>
                  )}
                  <span className="rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-semibold text-navy-700">
                    {open} open
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-bold text-navy-800">Recent Tasks</h2>
          {recent.length === 0 ? (
            <EmptyState title="No tasks yet" />
          ) : (
            <div className="space-y-3">
              {recent.map((t) => (
                <TaskCard key={t.id} task={t} assigneeName={nameOf(t.assigned_to)} onClick={() => onOpen(t)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function EmployeeDashboard({
  tasks,
  onOpen,
  nameOf,
}: {
  tasks: Task[];
  onOpen: (t: Task) => void;
  nameOf: (id: string) => string;
}) {
  const todays = tasks.filter((t) => isDueToday(t) && t.status !== 'COMPLETED');
  const upcoming = tasks
    .filter((t) => {
      const d = daysUntilDeadline(t);
      return t.status !== 'COMPLETED' && d !== null && d > 0 && d <= 7;
    })
    .sort((a, b) => (daysUntilDeadline(a) ?? 0) - (daysUntilDeadline(b) ?? 0));
  const pending = tasks.filter((t) => t.status !== 'COMPLETED');

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Today" value={todays.length} accent="bg-gold-100 text-gold-700" icon={<Clock size={20} />} />
        <StatCard label="Upcoming" value={upcoming.length} accent="bg-blue-100 text-blue-700" icon={<ListTodo size={20} />} />
        <StatCard label="Pending" value={pending.length} icon={<AlertTriangle size={20} />} />
      </div>

      <Section title="Today's Tasks" tasks={todays} empty="Nothing due today." onOpen={onOpen} nameOf={nameOf} />
      <Section title="Upcoming Deadlines (7 days)" tasks={upcoming} empty="No upcoming deadlines." onOpen={onOpen} nameOf={nameOf} />
      <Section title="All Pending Work" tasks={pending} empty="You're all caught up!" onOpen={onOpen} nameOf={nameOf} />
    </>
  );
}

function Section({
  title,
  tasks,
  empty,
  onOpen,
  nameOf,
}: {
  title: string;
  tasks: Task[];
  empty: string;
  onOpen: (t: Task) => void;
  nameOf: (id: string) => string;
}) {
  return (
    <section>
      <h2 className="mb-3 font-bold text-navy-800">{title}</h2>
      {tasks.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} assigneeName={nameOf(t.assigned_to)} onClick={() => onOpen(t)} />
          ))}
        </div>
      )}
    </section>
  );
}
