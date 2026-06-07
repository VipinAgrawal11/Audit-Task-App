import { Bell, CheckCheck } from 'lucide-react';
import { useNotificationsData, useTasksData } from '@/contexts/DataContext';
import { useTaskUI } from '@/contexts/TaskUIContext';
import { EmptyState, Spinner } from '@/components/ui/Misc';
import { formatDateTime, cn } from '@/lib/utils';

export function Notifications() {
  const { items, loading, unreadCount, markRead, markAllRead } = useNotificationsData();
  const { tasks } = useTasksData();
  const { openTask } = useTaskUI();

  function handleClick(notificationId: string, taskId: string | null, read: boolean) {
    if (!read) markRead(notificationId);
    if (taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) openTask(task);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Notifications</h1>
          <p className="text-sm text-navy-400">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn-ghost" onClick={markAllRead}>
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Bell size={40} />} title="No notifications yet" />
      ) : (
        <div className="card divide-y divide-navy-100">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n.id, n.task_id, n.read_status)}
              className={cn(
                'flex w-full items-start gap-3 p-4 text-left transition hover:bg-navy-50',
                !n.read_status && 'bg-gold-50/60',
              )}
            >
              <span
                className={cn(
                  'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                  n.read_status ? 'bg-navy-200' : 'bg-gold-500',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm', n.read_status ? 'text-navy-600' : 'font-semibold text-navy-800')}>
                  {n.message}
                </p>
                <p className="mt-0.5 text-xs text-navy-400">{formatDateTime(n.created_at)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
