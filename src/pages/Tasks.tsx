import { useMemo, useState } from 'react';
import { Plus, Search, ListChecks } from 'lucide-react';
import { useTasksData, useUsersData } from '@/contexts/DataContext';
import { useTaskUI } from '@/contexts/TaskUIContext';
import { TaskCard } from '@/components/tasks/TaskCard';
import { EmptyState, Spinner } from '@/components/ui/Misc';
import {
  STATUS_LABELS,
  STATUS_ORDER,
  type TaskStatus,
  type TaskPriority,
  PRIORITY_LABELS,
} from '@/types';
import { isDelayed } from '@/lib/utils';

type StatusFilter = TaskStatus | 'ALL' | 'DELAYED';

export function Tasks() {
  const { tasks, loading } = useTasksData();
  const { byId } = useUsersData();
  const { openTask, openCreate, canCreate } = useTaskUI();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [priority, setPriority] = useState<TaskPriority | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (status === 'DELAYED' && !isDelayed(t)) return false;
      if (status !== 'ALL' && status !== 'DELAYED' && t.status !== status) return false;
      if (priority !== 'ALL' && t.priority !== priority) return false;
      if (q && !`${t.title} ${t.description} ${t.remarks}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, query, status, priority]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-navy-800">Tasks</h1>
          <p className="text-sm text-navy-400">{tasks.length} total</p>
        </div>
        {canCreate && (
          <button className="btn-gold ml-auto" onClick={openCreate}>
            <Plus size={18} /> New Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" size={18} />
          <input
            className="input pl-10"
            placeholder="Search tasks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-48"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
        >
          <option value="ALL">All statuses</option>
          <option value="DELAYED">Delayed</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          className="input sm:w-40"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority | 'ALL')}
        >
          <option value="ALL">All priorities</option>
          {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={40} />}
          title="No tasks found"
          description="Try adjusting filters, or create a new task."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              assigneeName={byId.get(t.assigned_to)?.name ?? 'Unknown'}
              onClick={() => openTask(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
