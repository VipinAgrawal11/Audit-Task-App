import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { StatusControl } from './StatusControl';
import { CommentThread } from './CommentThread';
import { PriorityBadge, DelayedBadge } from '@/components/ui/Badges';
import { useAuth } from '@/contexts/AuthContext';
import { useUsersData } from '@/contexts/DataContext';
import type { Task, TaskStatus } from '@/types';
import { formatDate, isDelayed } from '@/lib/utils';

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onUpdateStatus: (id: string, status: TaskStatus, delayReason: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TaskDetail({ task, onClose, onEdit, onUpdateStatus, onDelete }: TaskDetailProps) {
  const { profile } = useAuth();
  const { byId } = useUsersData();
  const [deleting, setDeleting] = useState(false);

  if (!profile) return null;
  const isStaff = profile.role === 'partner' || profile.role === 'manager';
  const isPartner = profile.role === 'partner';
  const isAssignee = task.assigned_to === profile.id;
  const canUpdateStatus = isStaff || isAssignee;

  const nameOf = (id: string) => byId.get(id)?.name ?? 'Unknown';

  async function handleDelete() {
    if (!confirm('Delete this task permanently?')) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (e) {
      alert((e as Error).message);
      setDeleting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Task Details" size="lg">
      <div className="space-y-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xl font-bold text-navy-800">{task.title}</h3>
            <PriorityBadge priority={task.priority} />
          </div>
          {task.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-navy-600">{task.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-lg bg-navy-50 p-4 text-sm sm:grid-cols-4">
          <Field label="Assigned To" value={nameOf(task.assigned_to)} />
          <Field label="Assigned By" value={nameOf(task.assigned_by)} />
          <Field label="Start" value={formatDate(task.start_date)} />
          <Field
            label="Deadline"
            value={
              <span className="inline-flex items-center gap-1.5">
                {formatDate(task.deadline)}
                {isDelayed(task) && <DelayedBadge />}
              </span>
            }
          />
        </div>

        {task.remarks && (
          <div>
            <p className="label">Remarks</p>
            <p className="rounded-lg bg-gold-50 px-3 py-2 text-sm text-navy-700">{task.remarks}</p>
          </div>
        )}

        {canUpdateStatus ? (
          <StatusControl
            current={task.status}
            currentDelayReason={task.delay_reason}
            onChange={(status, reason) => onUpdateStatus(task.id, status, reason)}
          />
        ) : (
          <div>
            <p className="label">Status</p>
            <p className="text-sm text-navy-600">View only.</p>
          </div>
        )}

        <hr className="border-navy-100" />

        <CommentThread taskId={task.id} nameOf={nameOf} />

        {(isStaff || isPartner) && (
          <div className="flex justify-end gap-2 border-t border-navy-100 pt-4">
            {isStaff && (
              <button className="btn-ghost" onClick={() => onEdit(task)}>
                <Pencil size={16} /> Edit
              </button>
            )}
            {isPartner && (
              <button
                className="btn bg-red-600 text-white hover:bg-red-500"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 size={16} /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-navy-400">{label}</p>
      <p className="mt-0.5 font-medium text-navy-700">{value}</p>
    </div>
  );
}
