import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Task, TaskStatus } from '@/types';

export interface NewTaskInput {
  title: string;
  description: string;
  assigned_to: string;
  priority: Task['priority'];
  start_date: string | null;
  deadline: string | null;
  remarks: string;
}

/**
 * Loads the tasks the current user is allowed to see (RLS does the filtering)
 * and keeps them live via a Supabase realtime subscription.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setTasks((data ?? []) as Task[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('tasks-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        // Re-fetch on any change so RLS visibility stays correct.
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  const createTask = useCallback(
    async (input: NewTaskInput, assignedBy: string) => {
      const { error } = await supabase.from('tasks').insert({
        ...input,
        assigned_by: assignedBy,
      });
      if (error) throw new Error(error.message);
    },
    [],
  );

  const updateTask = useCallback(async (id: string, patch: Partial<Task>) => {
    const { error } = await supabase.from('tasks').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  const updateStatus = useCallback(
    async (id: string, status: TaskStatus, delayReason?: string | null) => {
      const patch: Partial<Task> = { status };
      // Only persist a delay reason while the task is on hold.
      patch.delay_reason = status === 'ON_HOLD' ? delayReason ?? null : null;
      const { error } = await supabase.from('tasks').update(patch).eq('id', id);
      if (error) throw new Error(error.message);
    },
    [],
  );

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }, []);

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    updateStatus,
    deleteTask,
  };
}
