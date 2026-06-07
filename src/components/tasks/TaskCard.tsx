import { CalendarClock, MessageSquare } from 'lucide-react';
import type { Task } from '@/types';
import { StatusBadge, PriorityBadge, DelayedBadge } from '@/components/ui/Badges';
import { Avatar } from '@/components/ui/Misc';
import { formatDate, isDelayed, cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  assigneeName: string;
  onClick: () => void;
}

export function TaskCard({ task, assigneeName, onClick }: TaskCardProps) {
  const delayed = isDelayed(task);

  return (
    <button
      onClick={onClick}
      className="card w-full p-4 text-left transition hover:border-gold-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-navy-800 line-clamp-2">{task.title}</h3>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.description && (
        <p className="mt-1 text-sm text-navy-400 line-clamp-2">{task.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={task.status} />
        {delayed && <DelayedBadge />}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-navy-100 pt-3">
        <div className="flex items-center gap-2">
          <Avatar name={assigneeName} size={26} />
          <span className="text-xs font-medium text-navy-600">{assigneeName}</span>
        </div>
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-medium',
            delayed ? 'text-red-600' : 'text-navy-400',
          )}
        >
          <CalendarClock size={14} />
          {formatDate(task.deadline)}
        </div>
      </div>

      {task.remarks && (
        <div className="mt-2 flex items-center gap-1 text-xs text-navy-400">
          <MessageSquare size={13} />
          <span className="line-clamp-1">{task.remarks}</span>
        </div>
      )}
    </button>
  );
}
