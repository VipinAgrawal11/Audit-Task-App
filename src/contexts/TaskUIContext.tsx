import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useTasksData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { TaskForm } from '@/components/tasks/TaskForm';
import type { Task } from '@/types';

interface TaskUIState {
  openTask: (task: Task) => void;
  openCreate: () => void;
  canCreate: boolean;
}

const TaskUIContext = createContext<TaskUIState | undefined>(undefined);

/**
 * Owns the task detail + create/edit modals so every page can trigger them
 * through a single, consistent entry point.
 */
export function TaskUIProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { tasks, createTask, updateTask, updateStatus, deleteTask } = useTasksData();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const canCreate = profile?.role === 'partner' || profile?.role === 'manager';

  // Read the live task from the store so it reflects realtime updates.
  const selected = selectedId ? tasks.find((t) => t.id === selectedId) ?? null : null;

  const value = useMemo<TaskUIState>(
    () => ({
      openTask: (task) => setSelectedId(task.id),
      openCreate: () => {
        setEditing(null);
        setFormOpen(true);
      },
      canCreate,
    }),
    [canCreate],
  );

  return (
    <TaskUIContext.Provider value={value}>
      {children}

      {selected && (
        <TaskDetail
          task={selected}
          onClose={() => setSelectedId(null)}
          onEdit={(task) => {
            setSelectedId(null);
            setEditing(task);
            setFormOpen(true);
          }}
          onUpdateStatus={updateStatus}
          onDelete={deleteTask}
        />
      )}

      {formOpen && profile && (
        <TaskForm
          open={formOpen}
          task={editing ?? undefined}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onCreate={(input) => createTask(input, profile.id)}
          onUpdate={updateTask}
        />
      )}
    </TaskUIContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTaskUI(): TaskUIState {
  const ctx = useContext(TaskUIContext);
  if (!ctx) throw new Error('useTaskUI must be used within a TaskUIProvider');
  return ctx;
}
