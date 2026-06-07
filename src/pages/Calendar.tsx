import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useTasksData, useUsersData } from '@/contexts/DataContext';
import { useTaskUI } from '@/contexts/TaskUIContext';
import { StatusBadge } from '@/components/ui/Badges';
import { EmptyState } from '@/components/ui/Misc';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

type View = 'month' | 'week' | 'day';

export function Calendar() {
  const { tasks } = useTasksData();
  const { byId } = useUsersData();
  const { openTask } = useTaskUI();
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(new Date());

  // Index tasks by their deadline day for quick lookup.
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.deadline) continue;
      const key = t.deadline.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tasks]);

  const tasksOn = (d: Date) => byDay.get(format(d, 'yyyy-MM-dd')) ?? [];

  function shift(dir: 1 | -1) {
    if (view === 'month') setCursor((c) => addMonths(c, dir));
    else if (view === 'week') setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => addDays(c, dir));
  }

  const heading =
    view === 'month'
      ? format(cursor, 'MMMM yyyy')
      : view === 'week'
        ? `${format(startOfWeek(cursor), 'd MMM')} – ${format(endOfWeek(cursor), 'd MMM yyyy')}`
        : format(cursor, 'EEEE, d MMM yyyy');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy-800">Calendar</h1>
        <div className="flex rounded-lg border border-navy-200 bg-white p-0.5">
          {(['day', 'week', 'month'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition',
                view === v ? 'bg-navy-700 text-white' : 'text-navy-500 hover:bg-navy-100',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={() => shift(-1)} aria-label="Previous">
          <ChevronLeft size={18} />
        </button>
        <h2 className="font-semibold text-navy-800">{heading}</h2>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setCursor(new Date())}>
            Today
          </button>
          <button className="btn-ghost" onClick={() => shift(1)} aria-label="Next">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {view === 'month' && <MonthView cursor={cursor} tasksOn={tasksOn} onOpen={openTask} />}
      {view === 'week' && (
        <ListView
          days={eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) })}
          tasksOn={tasksOn}
          onOpen={openTask}
          nameOf={(id) => byId.get(id)?.name ?? 'Unknown'}
        />
      )}
      {view === 'day' && (
        <ListView
          days={[cursor]}
          tasksOn={tasksOn}
          onOpen={openTask}
          nameOf={(id) => byId.get(id)?.name ?? 'Unknown'}
        />
      )}
    </div>
  );
}

function MonthView({
  cursor,
  tasksOn,
  onOpen,
}: {
  cursor: Date;
  tasksOn: (d: Date) => Task[];
  onOpen: (t: Task) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor)),
    end: endOfWeek(endOfMonth(cursor)),
  });

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-navy-100 bg-navy-50 text-center text-xs font-semibold text-navy-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const items = tasksOn(d);
          return (
            <div
              key={d.toISOString()}
              className={cn(
                'min-h-[84px] border-b border-r border-navy-100 p-1.5',
                !isSameMonth(d, cursor) && 'bg-navy-50/50',
              )}
            >
              <div
                className={cn(
                  'mb-1 text-right text-xs font-medium',
                  isToday(d) ? 'text-gold-600' : 'text-navy-400',
                )}
              >
                {format(d, 'd')}
              </div>
              <div className="space-y-1">
                {items.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onOpen(t)}
                    className="block w-full truncate rounded bg-navy-100 px-1 py-0.5 text-left text-[11px] font-medium text-navy-700 hover:bg-gold-100"
                    title={t.title}
                  >
                    {t.title}
                  </button>
                ))}
                {items.length > 3 && (
                  <p className="px-1 text-[10px] text-navy-400">+{items.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({
  days,
  tasksOn,
  onOpen,
  nameOf,
}: {
  days: Date[];
  tasksOn: (d: Date) => Task[];
  onOpen: (t: Task) => void;
  nameOf: (id: string) => string;
}) {
  const hasAny = days.some((d) => tasksOn(d).length > 0);
  if (!hasAny) return <EmptyState title="No deadlines in this range" />;

  return (
    <div className="space-y-4">
      {days.map((d) => {
        const items = tasksOn(d);
        if (items.length === 0) return null;
        return (
          <div key={d.toISOString()}>
            <h3
              className={cn(
                'mb-2 text-sm font-semibold',
                isSameDay(d, new Date()) ? 'text-gold-600' : 'text-navy-600',
              )}
            >
              {format(d, 'EEEE, d MMM')}
            </h3>
            <div className="card divide-y divide-navy-100">
              {items.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onOpen(t)}
                  className="flex w-full items-center gap-3 p-3 text-left hover:bg-navy-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-navy-800">{t.title}</p>
                    <p className="text-xs text-navy-400">{nameOf(t.assigned_to)}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
