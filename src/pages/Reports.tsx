import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { useTasksData, useUsersData } from '@/contexts/DataContext';
import { Avatar, EmptyState } from '@/components/ui/Misc';
import { isDelayed, cn } from '@/lib/utils';
import type { AppUser } from '@/types';

interface Row {
  user: AppUser;
  assigned: number;
  completed: number;
  pending: number;
  delayed: number;
  completionPct: number;
}

export function Reports() {
  const { tasks } = useTasksData();
  const { users } = useUsersData();

  const rows = useMemo<Row[]>(() => {
    return users
      .filter((u) => u.role === 'employee')
      .map((user) => {
        const mine = tasks.filter((t) => t.assigned_to === user.id);
        const completed = mine.filter((t) => t.status === 'COMPLETED').length;
        const delayed = mine.filter(isDelayed).length;
        const assigned = mine.length;
        const pending = assigned - completed;
        const completionPct = assigned === 0 ? 0 : Math.round((completed / assigned) * 100);
        return { user, assigned, completed, pending, delayed, completionPct };
      })
      .sort((a, b) => b.completionPct - a.completionPct);
  }, [users, tasks]);

  function exportCsv() {
    const header = ['Employee', 'Assigned', 'Completed', 'Pending', 'Delayed', 'Completion %'];
    const lines = rows.map((r) =>
      [r.user.name, r.assigned, r.completed, r.pending, r.delayed, `${r.completionPct}%`].join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productivity-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Productivity Report</h1>
          <p className="text-sm text-navy-400">Per-employee task completion</p>
        </div>
        {rows.length > 0 && (
          <button className="btn-ghost" onClick={exportCsv}>
            <Download size={16} /> Export CSV
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No employees to report on yet" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-navy-50 text-left text-xs font-semibold uppercase tracking-wide text-navy-500">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3 text-center">Assigned</th>
                  <th className="px-4 py-3 text-center">Completed</th>
                  <th className="px-4 py-3 text-center">Pending</th>
                  <th className="px-4 py-3 text-center">Delayed</th>
                  <th className="px-4 py-3">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {rows.map((r) => (
                  <tr key={r.user.id} className="hover:bg-navy-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.user.name} size={30} />
                        <span className="font-medium text-navy-700">{r.user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">{r.assigned}</td>
                    <td className="px-4 py-3 text-center text-green-700">{r.completed}</td>
                    <td className="px-4 py-3 text-center text-blue-700">{r.pending}</td>
                    <td className="px-4 py-3 text-center text-red-600">{r.delayed}</td>
                    <td className="px-4 py-3">
                      <CompletionBar pct={r.completionPct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {rows.map((r) => (
              <div key={r.user.id} className="card p-4">
                <div className="mb-3 flex items-center gap-2.5">
                  <Avatar name={r.user.name} size={32} />
                  <span className="font-semibold text-navy-800">{r.user.name}</span>
                </div>
                <div className="mb-3 grid grid-cols-4 gap-2 text-center text-sm">
                  <Metric label="Assigned" value={r.assigned} />
                  <Metric label="Done" value={r.completed} className="text-green-700" />
                  <Metric label="Pending" value={r.pending} className="text-blue-700" />
                  <Metric label="Delayed" value={r.delayed} className="text-red-600" />
                </div>
                <CompletionBar pct={r.completionPct} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CompletionBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-navy-100">
        <div
          className={cn(
            'h-full rounded-full',
            pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-gold-500' : 'bg-red-400',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-semibold text-navy-600">{pct}%</span>
    </div>
  );
}

function Metric({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <p className={cn('text-lg font-bold text-navy-800', className)}>{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-navy-400">{label}</p>
    </div>
  );
}
