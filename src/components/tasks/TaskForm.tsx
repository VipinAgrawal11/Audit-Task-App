import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useUsersData } from '@/contexts/DataContext';
import { PRIORITY_LABELS, type Task, type TaskPriority } from '@/types';
import type { NewTaskInput } from '@/hooks/useTasks';

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  /** Provided when editing an existing task. */
  task?: Task;
  onCreate?: (input: NewTaskInput) => Promise<void>;
  onUpdate?: (id: string, patch: Partial<Task>) => Promise<void>;
}

export function TaskForm({ open, onClose, task, onCreate, onUpdate }: TaskFormProps) {
  const { users, employees } = useUsersData();
  const isEdit = Boolean(task);

  // Staff can also be assignees (e.g. manager reviewing); include everyone but
  // default the picker to employees.
  const assignable = users.length ? users : employees;

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'MEDIUM');
  const [startDate, setStartDate] = useState(task?.start_date ?? '');
  const [deadline, setDeadline] = useState(task?.deadline ?? '');
  const [remarks, setRemarks] = useState(task?.remarks ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError('Task name is required.');
    if (!assignedTo) return setError('Please choose an assignee.');

    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        assigned_to: assignedTo,
        priority,
        start_date: startDate || null,
        deadline: deadline || null,
        remarks: remarks.trim(),
      };
      if (isEdit && task && onUpdate) {
        await onUpdate(task.id, payload);
      } else if (onCreate) {
        await onCreate(payload);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Task' : 'Create Task'}
      size="lg"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button form="task-form" type="submit" className="btn-primary" disabled={busy}>
            {isEdit ? 'Save Changes' : 'Create Task'}
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div>
          <label className="label" htmlFor="title">
            Task Name
          </label>
          <input
            id="title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Prepare VAT reconciliation"
            autoFocus
          />
        </div>

        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            className="input resize-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add detail, scope, or instructions…"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="assignee">
              Assign To
            </label>
            <select
              id="assignee"
              className="input"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">Select staff…</option>
              {assignable.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="priority">
              Priority
            </label>
            <select
              id="priority"
              className="input"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="start">
              Start Date
            </label>
            <input
              id="start"
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="deadline">
              Deadline
            </label>
            <input
              id="deadline"
              type="date"
              className="input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="remarks">
            Remarks
          </label>
          <input
            id="remarks"
            className="input"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional note shown on the task"
          />
        </div>
      </form>
    </Modal>
  );
}
